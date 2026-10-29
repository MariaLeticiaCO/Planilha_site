using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class FormaPagamentoService(IRepository<FormaPagamento> formas, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<FormaPagamentoDto>> ListarAsync(bool somenteAtivas = false)
    {
        var q = formas.Query();
        if (somenteAtivas) q = q.Where(f => f.Ativo);
        return await q.OrderBy(f => f.Ordem).ThenBy(f => f.Nome)
            .Select(f => new FormaPagamentoDto
            {
                Id = f.Id, Tipo = f.Tipo, Nome = f.Nome, TaxaPercentual = f.TaxaPercentual, TaxaFixa = f.TaxaFixa, Ativo = f.Ativo
            })
            .ToListAsync();
    }

    public async Task SalvarAsync(FormaPagamentoDto dto)
    {
        FormaPagamento forma;
        if (dto.Id == 0)
        {
            var ordem = await formas.Query().Select(f => (int?)f.Ordem).MaxAsync() ?? 0;
            forma = new FormaPagamento { Ordem = ordem + 1 };
            formas.Adicionar(forma);
        }
        else
        {
            forma = await formas.Query().FirstOrDefaultAsync(f => f.Id == dto.Id) ?? throw new NaoEncontradoException("Forma de pagamento");
        }

        var nome = dto.Nome.Trim();
        if (await formas.Query().AnyAsync(f => f.Nome == nome && f.Id != dto.Id))
            throw new RegraNegocioException("Já existe uma forma de pagamento com este nome.");

        forma.Tipo = dto.Tipo;
        forma.Nome = nome;
        forma.TaxaPercentual = dto.TaxaPercentual;
        forma.TaxaFixa = dto.TaxaFixa;
        forma.Ativo = dto.Ativo;
        await uow.SalvarAsync();
    }

    public async Task AlterarAtivoAsync(int id, bool ativo)
    {
        var forma = await formas.Query().FirstOrDefaultAsync(f => f.Id == id) ?? throw new NaoEncontradoException("Forma de pagamento");
        forma.Ativo = ativo;
        await uow.SalvarAsync();
    }

    /// <summary>Crédito parcelado vira uma forma por faixa (ex.: "Crédito 2–6x", "Crédito 7–12x").</summary>
    public async Task CriarFaixasCreditoAsync()
    {
        string[] faixas = ["Crédito 2–6x", "Crédito 7–12x"];
        var existentes = await formas.Query().Select(f => f.Nome).ToListAsync();
        var ordem = await formas.Query().Select(f => (int?)f.Ordem).MaxAsync() ?? 0;

        var credito = await formas.Query().FirstOrDefaultAsync(f => f.Tipo == TipoPagamento.CREDITO && f.Nome == "Crédito");
        if (credito is not null) credito.Nome = "Crédito 1x";

        foreach (var faixa in faixas.Where(f => !existentes.Contains(f)))
            formas.Adicionar(new FormaPagamento { Tipo = TipoPagamento.CREDITO, Nome = faixa, Ordem = ++ordem });
        await uow.SalvarAsync();
    }
}
