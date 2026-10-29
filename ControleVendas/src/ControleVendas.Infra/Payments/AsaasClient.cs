using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Rules;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ControleVendas.Infra.Payments;

public class AsaasOptions
{
    /// <summary>https://api.asaas.com/v3 (produção) ou https://api-sandbox.asaas.com/v3 (sandbox).</summary>
    public string UrlBase { get; set; } = "https://api-sandbox.asaas.com/v3";
    public string? ApiKey { get; set; }
    /// <summary>Token configurado no painel do Asaas para o webhook (header asaas-access-token).</summary>
    public string? TokenWebhook { get; set; }
    public bool Configurado => !string.IsNullOrWhiteSpace(ApiKey);
}

/// <summary>Integração com a API v3 do Asaas: clientes, cobranças avulsas (Básico) e assinaturas (Pro).</summary>
public class AsaasClient(HttpClient http, IOptions<AsaasOptions> options, ILogger<AsaasClient> logger) : IGatewayPagamento
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public bool Simulado => false;

    public async Task<string> SalvarClienteAsync(string? clienteId, string nome, string email, string? telefone, string? cpfCnpj,
        CancellationToken ct = default)
    {
        var corpo = new { name = nome, email, mobilePhone = telefone, cpfCnpj, notificationDisabled = false };
        var url = string.IsNullOrEmpty(clienteId) ? "customers" : $"customers/{clienteId}";
        var resposta = await EnviarAsync<AsaasId>(HttpMethod.Post, url, corpo, ct);
        return resposta.Id;
    }

    public async Task<CobrancaGatewayDto> CriarCobrancaAsync(NovaCobrancaGatewayDto dados, CancellationToken ct = default)
    {
        var billingType = dados.Forma == FormaPagamentoAssinatura.PIX ? "PIX" : "CREDIT_CARD";
        var vencimento = Relogio.Hoje.AddDays(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        string pagamentoId;
        string? assinaturaId = null;
        string? link;

        if (dados.Opcao == OpcaoPlano.BASICO)
        {
            var pagamento = await EnviarAsync<AsaasPagamento>(HttpMethod.Post, "payments", new
            {
                customer = dados.ClienteId, billingType, value = dados.Valor, dueDate = vencimento,
                description = dados.Descricao, externalReference = dados.ReferenciaExterna
            }, ct);
            pagamentoId = pagamento.Id;
            link = pagamento.InvoiceUrl;
        }
        else
        {
            var assinatura = await EnviarAsync<AsaasId>(HttpMethod.Post, "subscriptions", new
            {
                customer = dados.ClienteId, billingType, value = dados.Valor, nextDueDate = vencimento,
                cycle = dados.Opcao == OpcaoPlano.PRO_ANUAL ? "YEARLY" : "MONTHLY",
                description = dados.Descricao, externalReference = dados.ReferenciaExterna
            }, ct);
            assinaturaId = assinatura.Id;
            var pagamentos = await EnviarAsync<AsaasLista<AsaasPagamento>>(HttpMethod.Get, $"subscriptions/{assinatura.Id}/payments", null, ct);
            var primeiro = pagamentos.Data.FirstOrDefault() ?? throw new RegraNegocioException("O gateway não gerou a primeira cobrança. Tente de novo.");
            pagamentoId = primeiro.Id;
            link = primeiro.InvoiceUrl;
        }

        string? qrCode = null, copiaECola = null;
        if (dados.Forma == FormaPagamentoAssinatura.PIX)
        {
            var pix = await EnviarAsync<AsaasPix>(HttpMethod.Get, $"payments/{pagamentoId}/pixQrCode", null, ct);
            qrCode = pix.EncodedImage;
            copiaECola = pix.Payload;
        }
        return new CobrancaGatewayDto(pagamentoId, assinaturaId, link, qrCode, copiaECola, Relogio.Hoje.AddDays(1));
    }

    public async Task<IReadOnlyList<PagamentoGatewayDto>> ListarPagamentosAsync(string clienteId, CancellationToken ct = default)
    {
        var lista = await EnviarAsync<AsaasLista<AsaasPagamento>>(HttpMethod.Get, $"payments?customer={Uri.EscapeDataString(clienteId)}&limit=50", null, ct);
        return lista.Data
            .Select(p => new PagamentoGatewayDto(p.Id, p.PaymentDate ?? p.DateCreated ?? p.DueDate ?? DateTime.MinValue, p.Value,
                p.Description ?? "", TraduzirStatus(p.Status), p.InvoiceUrl))
            .OrderByDescending(p => p.Data).ToList();
    }

    public async Task CancelarAssinaturaAsync(string assinaturaId, CancellationToken ct = default) =>
        await EnviarAsync<JsonElement>(HttpMethod.Delete, $"subscriptions/{assinaturaId}", null, ct);

    private async Task<T> EnviarAsync<T>(HttpMethod metodo, string caminho, object? corpo, CancellationToken ct)
    {
        var cfg = options.Value;
        using var req = new HttpRequestMessage(metodo, $"{cfg.UrlBase.TrimEnd('/')}/{caminho}");
        req.Headers.Add("access_token", cfg.ApiKey);
        req.Headers.UserAgent.ParseAdd("ControleVendas/1.0");
        if (corpo is not null) req.Content = JsonContent.Create(corpo, options: Json);

        using var resp = await http.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var erro = await resp.Content.ReadAsStringAsync(ct);
            logger.LogError("Asaas {Metodo} {Caminho} falhou ({Status}): {Erro}", metodo, caminho, (int)resp.StatusCode, erro);
            throw new RegraNegocioException(ExtrairMensagem(erro) ?? "Não foi possível falar com o gateway de pagamento. Tente de novo.");
        }
        return (await resp.Content.ReadFromJsonAsync<T>(Json, ct))!;
    }

    private static string? ExtrairMensagem(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("errors")[0].GetProperty("description").GetString();
        }
        catch { return null; }
    }

    private static string TraduzirStatus(string? status) => status switch
    {
        "RECEIVED" or "CONFIRMED" or "RECEIVED_IN_CASH" => "Pago",
        "PENDING" => "Aguardando pagamento",
        "OVERDUE" => "Vencido",
        "REFUNDED" => "Estornado",
        _ => status ?? "-"
    };

    private sealed record AsaasId(string Id);
    private sealed record AsaasLista<T>(List<T> Data);
    private sealed record AsaasPix(string? EncodedImage, string? Payload);
    private sealed record AsaasPagamento(string Id, decimal Value, string? Status, string? Description, string? InvoiceUrl,
        DateTime? DueDate, DateTime? PaymentDate, DateTime? DateCreated);
}

/// <summary>
/// Gateway de mentira para desenvolvimento (sem ApiKey do Asaas). A tela de assinatura mostra um botão
/// "Simular pagamento confirmado" que ativa o plano na hora.
/// </summary>
public class GatewaySimulado : IGatewayPagamento
{
    public bool Simulado => true;

    public Task<string> SalvarClienteAsync(string? clienteId, string nome, string email, string? telefone, string? cpfCnpj,
        CancellationToken ct = default) => Task.FromResult(clienteId ?? "cus_simulado_" + Guid.NewGuid().ToString("N")[..10]);

    public Task<CobrancaGatewayDto> CriarCobrancaAsync(NovaCobrancaGatewayDto dados, CancellationToken ct = default) =>
        Task.FromResult(new CobrancaGatewayDto("pay_simulado", dados.Opcao == OpcaoPlano.BASICO ? null : "sub_simulado", null, null,
            dados.Forma == FormaPagamentoAssinatura.PIX ? "00020126580014BR.GOV.BCB.PIX-SIMULADO" : null, Relogio.Hoje.AddDays(1)));

    public Task<IReadOnlyList<PagamentoGatewayDto>> ListarPagamentosAsync(string clienteId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<PagamentoGatewayDto>>([]);

    public Task CancelarAssinaturaAsync(string assinaturaId, CancellationToken ct = default) => Task.CompletedTask;
}
