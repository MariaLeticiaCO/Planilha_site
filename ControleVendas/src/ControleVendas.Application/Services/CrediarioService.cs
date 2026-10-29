using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class CrediarioService(
    IRepository<ParcelaCrediarioView> view,
    IRepository<ParcelaCrediario> parcelas,
    IUnitOfWork uow,
    EmpresaService empresaService)
{
    public const string AbaAtrasadas = "atrasadas";
    public const string AbaAVencer = "a-vencer";
    public const string AbaPagas = "pagas";

    public async Task<ResumoCrediarioDto> ResumoAsync()
    {
        var hoje = Relogio.Hoje;
        var fimSemana = hoje.AddDays(7);
        var abertas = await view.Query().Where(p => p.Situacao != "PAGA")
            .Select(p => new { p.Valor, p.Situacao, p.DataVencimento }).ToListAsync();
        return new ResumoCrediarioDto(
            abertas.Sum(p => p.Valor),
            abertas.Where(p => p.Situacao == "ATRASADA").Sum(p => p.Valor),
            abertas.Where(p => p.Situacao == "ABERTA" && p.DataVencimento < fimSemana).Sum(p => p.Valor),
            abertas.Count(p => p.Situacao == "ATRASADA"));
    }

    public async Task<IReadOnlyList<ParcelaDto>> ListarAsync(string aba, int? clienteId = null)
    {
        var q = view.Query();
        if (clienteId is not null) q = q.Where(p => p.ClienteId == clienteId);
        q = aba switch
        {
            AbaAtrasadas => q.Where(p => p.Situacao == "ATRASADA").OrderBy(p => p.DataVencimento).ThenBy(p => p.ClienteNome),
            AbaPagas => q.Where(p => p.Situacao == "PAGA").OrderByDescending(p => p.DataPagamento).Take(200),
            _ => q.Where(p => p.Situacao == "ABERTA").OrderBy(p => p.DataVencimento).ThenBy(p => p.ClienteNome)
        };
        return await q.Select(p => new ParcelaDto(p.Id, p.VendaId, p.ClienteId, p.ClienteNome, p.ClienteTelefone, p.Numero,
                p.TotalParcelas, p.Valor, p.DataVencimento, p.DataPagamento, p.ValorPago, p.Situacao, p.DiasAtraso))
            .ToListAsync();
    }

    /// <summary>Visão agrupada: total devido por pessoa.</summary>
    public async Task<IReadOnlyList<DevedorDto>> AgruparPorClienteAsync()
    {
        var abertas = await view.Query().Where(p => p.Situacao != "PAGA")
            .Select(p => new { p.ClienteId, p.ClienteNome, p.ClienteTelefone, p.Valor, p.Situacao, p.DataVencimento })
            .ToListAsync();
        return abertas.GroupBy(p => p.ClienteId)
            .Select(g => new DevedorDto(g.Key, g.First().ClienteNome, g.First().ClienteTelefone, g.Count(), g.Sum(p => p.Valor),
                g.Where(p => p.Situacao == "ATRASADA").Sum(p => p.Valor), g.Min(p => p.DataVencimento)))
            .OrderByDescending(d => d.Atrasado).ThenByDescending(d => d.TotalDevido)
            .ToList();
    }

    /// <summary>Dá baixa no valor total da parcela (pagamento parcial fica para a versão 2).</summary>
    public async Task<BaixaParcelaDto> DarBaixaAsync(int parcelaId)
    {
        await empresaService.ExigirProAsync("O crediário");
        var parcela = await parcelas.Query().FirstOrDefaultAsync(p => p.Id == parcelaId) ?? throw new NaoEncontradoException("Parcela");
        if (parcela.Status != StatusParcela.ABERTA) throw new RegraNegocioException("Esta parcela não está em aberto.");
        parcela.Status = StatusParcela.PAGA;
        parcela.DataPagamento = Relogio.Agora;
        parcela.ValorPago = parcela.Valor;
        await uow.SalvarAsync();
        return new BaixaParcelaDto(parcela.Id, parcela.DataPagamento.Value, parcela.ValorPago.Value);
    }

    /// <summary>Monta o link https://wa.me/55{telefone}?text={mensagem} com nome, valor e vencimento.</summary>
    public async Task<string> LinkCobrancaAsync(int parcelaId)
    {
        var p = await view.Query().FirstOrDefaultAsync(x => x.Id == parcelaId) ?? throw new NaoEncontradoException("Parcela");
        var empresa = await empresaService.ObterAsync();
        var primeiroNome = p.ClienteNome.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? p.ClienteNome;
        var situacao = p.Situacao == "ATRASADA"
            ? $"que venceu em {Formatos.Data(p.DataVencimento)} ({p.DiasAtraso} {(p.DiasAtraso == 1 ? "dia" : "dias")} de atraso)"
            : $"com vencimento em {Formatos.Data(p.DataVencimento)}";
        var mensagem =
            $"Olá, {primeiroNome}! Tudo bem? 😊\n" +
            $"Passando para lembrar da parcela {p.Numero}/{p.TotalParcelas} de *{Formatos.Moeda(p.Valor)}* " +
            $"da sua compra na {empresa.Nome}, {situacao}.\n" +
            "Pode pagar por Pix ou como preferir. Qualquer dúvida, é só me chamar. Obrigado!";
        return Formatos.LinkWhatsApp(p.ClienteTelefone, mensagem);
    }
}
