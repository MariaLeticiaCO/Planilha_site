using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class AssinaturaService(
    IRepository<Empresa> empresas,
    IRepository<Usuario> usuarios,
    IUnitOfWork uow,
    IGatewayPagamento gateway,
    EmpresaService empresaService,
    IContextoUsuario contexto)
{
    /// <summary>Dias de tolerância depois do vencimento da mensalidade/anuidade.</summary>
    public const int DiasTolerancia = 3;

    public async Task<AssinaturaStatusDto> StatusAsync()
    {
        var e = await empresaService.ObterAsync();
        var agora = Relogio.Agora;
        return new AssinaturaStatusDto(e.Plano, e.StatusAssinatura, e.AssinaturaAtiva(agora), e.DiasRestantesTrial(agora),
            e.DataFimTrial, e.DataFimAssinatura, gateway.Simulado);
    }

    /// <summary>Gera a cobrança no gateway: Pix (QR Code) ou link de pagamento com cartão.</summary>
    public async Task<CobrancaGatewayDto> CheckoutAsync(CheckoutDto dto)
    {
        if (!contexto.EhDono) throw new RegraNegocioException("Só o dono pode assinar.");
        var empresa = await empresaService.ObterAsync();
        if (empresa.Plano == Plano.BASICO && empresa.StatusAssinatura == StatusAssinatura.ATIVA && dto.Opcao == OpcaoPlano.BASICO)
            throw new RegraNegocioException("Você já tem o plano Básico.");

        var documento = Formatos.SoDigitos(dto.CpfCnpj);
        if (!gateway.Simulado && documento is not { Length: 11 or 14 })
            throw new RegraNegocioException("Informe um CPF ou CNPJ válido para emitir a cobrança.");

        var dono = await usuarios.Query().Where(u => u.Perfil == PerfilUsuario.DONO).OrderBy(u => u.Id).FirstAsync();
        var clienteId = await gateway.SalvarClienteAsync(empresa.GatewayClienteId, empresa.Nome, dono.Email,
            dono.Telefone ?? empresa.Telefone, documento);
        if (clienteId != empresa.GatewayClienteId)
        {
            empresa.GatewayClienteId = clienteId;
            await uow.SalvarAsync();
        }

        var plano = Planos.Obter(dto.Opcao);
        var cobranca = await gateway.CriarCobrancaAsync(new NovaCobrancaGatewayDto(
            empresa.GatewayClienteId, dto.Opcao, plano.Preco, $"Controle de Vendas — {plano.Nome}", dto.Forma,
            ReferenciaExterna(empresa.Id, dto.Opcao)));

        if (cobranca.AssinaturaId is not null && cobranca.AssinaturaId != empresa.GatewayAssinaturaId)
        {
            // Troca de plano: a assinatura antiga deixa de cobrar.
            if (!string.IsNullOrEmpty(empresa.GatewayAssinaturaId))
            {
                try { await gateway.CancelarAssinaturaAsync(empresa.GatewayAssinaturaId); } catch { /* segue com a nova */ }
            }
            empresa.GatewayAssinaturaId = cobranca.AssinaturaId;
            await uow.SalvarAsync();
        }
        return cobranca;
    }

    public async Task<IReadOnlyList<PagamentoGatewayDto>> HistoricoAsync()
    {
        var empresa = await empresaService.ObterAsync();
        if (string.IsNullOrEmpty(empresa.GatewayClienteId)) return [];
        try { return await gateway.ListarPagamentosAsync(empresa.GatewayClienteId); }
        catch { return []; }
    }

    /// <summary>
    /// Trata o webhook do gateway: atualiza Plano e StatusAssinatura.
    /// Idempotente: o fim do período é calculado pelo vencimento da cobrança, então repetir o evento não soma tempo.
    /// </summary>
    public async Task ProcessarWebhookAsync(WebhookPagamentoDto evento)
    {
        var referencia = evento.Payment?.ExternalReference ?? evento.Subscription?.ExternalReference;
        if (!TentarLerReferencia(referencia, out var empresaId, out var opcao)) return;

        var empresa = await empresas.QuerySemFiltroEmpresa().FirstOrDefaultAsync(e => e.Id == empresaId);
        if (empresa is null) return;

        // O cliente do gateway precisa ser o mesmo da empresa (evita referência forjada).
        var clienteEvento = evento.Payment?.Customer ?? evento.Subscription?.Customer;
        if (!string.IsNullOrEmpty(empresa.GatewayClienteId) && clienteEvento != empresa.GatewayClienteId) return;

        switch (evento.Event)
        {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED":
                AplicarPagamento(empresa, opcao, evento.Payment?.DueDate ?? Relogio.Hoje);
                if (!string.IsNullOrEmpty(evento.Payment?.Subscription)) empresa.GatewayAssinaturaId = evento.Payment.Subscription;
                break;
            case "PAYMENT_REFUNDED":
            case "PAYMENT_CHARGEBACK_REQUESTED":
                empresa.StatusAssinatura = StatusAssinatura.VENCIDA;
                break;
            case "SUBSCRIPTION_DELETED":
            case "SUBSCRIPTION_INACTIVATED":
                if (empresa.Plano == Plano.PRO && evento.Subscription?.Id == empresa.GatewayAssinaturaId)
                    empresa.StatusAssinatura = StatusAssinatura.CANCELADA;
                break;
            default:
                return;
        }
        await uow.SalvarAsync();
    }

    /// <summary>Somente em desenvolvimento, sem gateway configurado: confirma o pagamento na hora.</summary>
    public async Task SimularPagamentoAsync(OpcaoPlano opcao)
    {
        if (!gateway.Simulado) throw new RegraNegocioException("Simulação desativada: o gateway real está configurado.");
        var empresa = await empresaService.ObterAsync();
        AplicarPagamento(empresa, opcao, Relogio.Hoje);
        await uow.SalvarAsync();
    }

    public static void AplicarPagamento(Empresa empresa, OpcaoPlano opcao, DateTime vencimentoCobranca)
    {
        var plano = Planos.Obter(opcao);
        var novoFim = opcao switch
        {
            OpcaoPlano.PRO_MENSAL => vencimentoCobranca.Date.AddMonths(1).AddDays(DiasTolerancia),
            OpcaoPlano.PRO_ANUAL => vencimentoCobranca.Date.AddYears(1).AddDays(DiasTolerancia),
            _ => (DateTime?)null
        };

        // Quem já tem o Pro e compra o Básico avulso continua no Pro até o fim do período pago.
        if (opcao == OpcaoPlano.BASICO && empresa.Plano == Plano.PRO && empresa.AssinaturaAtiva(Relogio.Agora)) return;

        empresa.Plano = plano.Plano;
        empresa.StatusAssinatura = StatusAssinatura.ATIVA;
        empresa.DataFimAssinatura = novoFim is null ? null
            : empresa.DataFimAssinatura is { } atual && atual > novoFim && empresa.Plano == Plano.PRO ? atual : novoFim;
    }

    public static string ReferenciaExterna(int empresaId, OpcaoPlano opcao) => $"empresa:{empresaId}:{opcao}";

    public static bool TentarLerReferencia(string? referencia, out int empresaId, out OpcaoPlano opcao)
    {
        empresaId = 0;
        opcao = default;
        var partes = referencia?.Split(':');
        return partes is { Length: 3 } && partes[0] == "empresa"
               && int.TryParse(partes[1], out empresaId)
               && Enum.TryParse(partes[2], out opcao);
    }
}
