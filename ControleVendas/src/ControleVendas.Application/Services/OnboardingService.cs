using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class OnboardingService(
    IRepository<Setor> setores,
    IRepository<Categoria> categorias,
    IRepository<FormaPagamento> formas,
    IRepository<Produto> produtos,
    IUnitOfWork uow,
    EmpresaService empresaService)
{
    /// <summary>As 5 formas de pagamento padrão, todas com taxa zero para o usuário ajustar.</summary>
    public static IReadOnlyList<FormaOnboardingDto> FormasPadrao() =>
    [
        new() { Tipo = TipoPagamento.PIX, Nome = "Pix" },
        new() { Tipo = TipoPagamento.DINHEIRO, Nome = "Dinheiro" },
        new() { Tipo = TipoPagamento.DEBITO, Nome = "Débito" },
        new() { Tipo = TipoPagamento.CREDITO, Nome = "Crédito" },
        new() { Tipo = TipoPagamento.CREDIARIO, Nome = "Crediário" }
    ];

    public async Task<IReadOnlyList<SetorDto>> ListarSetoresAsync() =>
        await setores.Query().OrderBy(s => s.Ordem)
            .Select(s => new SetorDto(s.Id, s.Nome, s.Icone, s.CategoriasSugeridas)).ToListAsync();

    public async Task ConcluirAsync(OnboardingDto dto)
    {
        var empresa = await empresaService.ObterAsync();
        if (empresa.OnboardingConcluido)
            throw new RegraNegocioException("A configuração inicial já foi feita. Ajuste os dados em Configurações.");

        var setor = await setores.Query().FirstOrDefaultAsync(s => s.Id == dto.SetorId)
                    ?? throw new RegraNegocioException("Escolha o setor do seu negócio.");

        await using var transacao = await uow.IniciarTransacaoAsync();

        empresa.Nome = dto.NomeNegocio.Trim();
        empresa.SetorId = setor.Id;

        // Categorias sugeridas pelo setor (ex.: Doces → Bolos, Doces finos, Salgados)
        var novasCategorias = setor.ListarCategoriasSugeridas().Select(n => new Categoria { Nome = n }).ToList();
        foreach (var c in novasCategorias) categorias.Adicionar(c);

        // 5 formas padrão, com as taxas informadas no passo 2
        var ordem = 0;
        foreach (var padrao in FormasPadrao())
        {
            var informada = dto.Formas.FirstOrDefault(f => f.Tipo == padrao.Tipo);
            formas.Adicionar(new FormaPagamento
            {
                Tipo = padrao.Tipo,
                Nome = padrao.Nome,
                TaxaPercentual = informada?.TaxaPercentual ?? 0,
                Ativo = informada?.Ativo ?? true,
                Ordem = ++ordem
            });
        }
        await uow.SalvarAsync();

        if (!dto.PularProduto && !string.IsNullOrWhiteSpace(dto.ProdutoNome) && dto.ProdutoPreco > 0)
        {
            produtos.Adicionar(new Produto
            {
                Nome = dto.ProdutoNome.Trim(),
                Custo = dto.ProdutoCusto ?? 0,
                PrecoVenda = dto.ProdutoPreco.Value,
                CategoriaId = novasCategorias.FirstOrDefault()?.Id,
                DataCadastro = Relogio.Agora
            });
        }

        empresa.OnboardingConcluido = true;
        await uow.SalvarAsync();
        await transacao.CommitAsync();
    }
}
