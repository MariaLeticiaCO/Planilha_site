using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class ProdutoService(
    IRepository<Produto> produtos,
    IRepository<ItemVenda> itens,
    IUnitOfWork uow,
    EmpresaService empresaService,
    IContextoUsuario usuario)
{
    public async Task<IReadOnlyList<ProdutoListaDto>> ListarAsync(FiltroProdutosDto filtro)
    {
        var q = produtos.Query();
        if (!string.IsNullOrWhiteSpace(filtro.Busca))
        {
            var busca = filtro.Busca.Trim();
            q = q.Where(p => p.Nome.Contains(busca) || (p.Codigo != null && p.Codigo.Contains(busca)));
        }
        if (filtro.CategoriaId is not null) q = q.Where(p => p.CategoriaId == filtro.CategoriaId);
        q = filtro.Status switch
        {
            "inativos" => q.Where(p => !p.Ativo),
            "todos" => q,
            "estoque-baixo" => q.Where(p => p.Ativo && p.Estoque <= p.EstoqueMinimo),
            _ => q.Where(p => p.Ativo)
        };

        return await q.OrderBy(p => p.Nome)
            .Select(p => new ProdutoListaDto(p.Id, p.Nome, p.Codigo, p.Categoria != null ? p.Categoria.Nome : null,
                p.Custo, p.PrecoVenda, p.MargemPercentual, p.Estoque, p.EstoqueMinimo, p.FotoUrl, p.Ativo))
            .ToListAsync();
    }

    public async Task<ProdutoDto> ObterAsync(int id)
    {
        var p = await produtos.Query().FirstOrDefaultAsync(x => x.Id == id) ?? throw new NaoEncontradoException("Produto");
        return new ProdutoDto
        {
            Id = p.Id, Nome = p.Nome, CategoriaId = p.CategoriaId, Codigo = p.Codigo, Custo = p.Custo,
            PrecoVenda = p.PrecoVenda, Estoque = p.Estoque, EstoqueMinimo = p.EstoqueMinimo, FotoUrl = p.FotoUrl, Ativo = p.Ativo
        };
    }

    public async Task<int> SalvarAsync(ProdutoDto dto)
    {
        Produto produto;
        if (dto.Id == 0)
        {
            // Limite do plano Básico (50 produtos) é checado aqui, no Service.
            var empresa = await empresaService.ObterAsync();
            var qtdAtivos = await produtos.Query().CountAsync(p => p.Ativo);
            if (qtdAtivos >= empresa.LimiteProdutos)
                throw new RegraNegocioException($"Seu plano permite até {empresa.LimiteProdutos} produtos ativos. Desative algum ou passe para o Pro.");
            produto = new Produto { DataCadastro = Relogio.Agora };
            produtos.Adicionar(produto);
        }
        else
        {
            produto = await produtos.Query().FirstOrDefaultAsync(x => x.Id == dto.Id) ?? throw new NaoEncontradoException("Produto");
        }

        if (!string.IsNullOrWhiteSpace(dto.Codigo))
        {
            var codigo = dto.Codigo.Trim();
            if (await produtos.Query().AnyAsync(p => p.Codigo == codigo && p.Id != dto.Id))
                throw new RegraNegocioException("Já existe um produto com este código.");
        }

        produto.Nome = dto.Nome.Trim();
        produto.CategoriaId = dto.CategoriaId;
        produto.Codigo = string.IsNullOrWhiteSpace(dto.Codigo) ? null : dto.Codigo.Trim();
        produto.Custo = dto.Custo;
        produto.PrecoVenda = dto.PrecoVenda;
        produto.Estoque = dto.Estoque;
        produto.EstoqueMinimo = dto.EstoqueMinimo;
        if (dto.FotoUrl is not null) produto.FotoUrl = dto.FotoUrl;
        await uow.SalvarAsync();
        return produto.Id;
    }

    public async Task AlterarAtivoAsync(int id, bool ativo)
    {
        var produto = await produtos.Query().FirstOrDefaultAsync(x => x.Id == id) ?? throw new NaoEncontradoException("Produto");
        if (ativo && !produto.Ativo)
        {
            var empresa = await empresaService.ObterAsync();
            if (await produtos.Query().CountAsync(p => p.Ativo) >= empresa.LimiteProdutos)
                throw new RegraNegocioException($"Seu plano permite até {empresa.LimiteProdutos} produtos ativos.");
        }
        produto.Ativo = ativo;
        await uow.SalvarAsync();
    }

    /// <summary>Produto com venda registrada não é excluído, só desativado.</summary>
    /// <returns>true se excluiu; false se apenas desativou.</returns>
    public async Task<bool> ExcluirAsync(int id)
    {
        var produto = await produtos.Query().FirstOrDefaultAsync(x => x.Id == id) ?? throw new NaoEncontradoException("Produto");
        if (await itens.Query().AnyAsync(i => i.ProdutoId == id))
        {
            produto.Ativo = false;
            await uow.SalvarAsync();
            return false;
        }
        produtos.Remover(produto);
        await uow.SalvarAsync();
        return true;
    }

    /// <summary>Busca do PDV por nome ou código. O custo só vai para o Dono (para mostrar o lucro da venda).</summary>
    public async Task<IReadOnlyList<ProdutoVendaDto>> BuscarParaVendaAsync(string? termo, int limite = 30)
    {
        var q = produtos.Query().Where(p => p.Ativo);
        if (!string.IsNullOrWhiteSpace(termo))
        {
            var t = termo.Trim();
            q = q.Where(p => p.Nome.Contains(t) || p.Codigo == t);
        }
        var lista = await q.OrderBy(p => p.Nome).Take(limite)
            .Select(p => new { p.Id, p.Nome, p.Codigo, p.PrecoVenda, p.Custo, p.Estoque, p.FotoUrl })
            .ToListAsync();
        return lista.Select(p => new ProdutoVendaDto(p.Id, p.Nome, p.Codigo, p.PrecoVenda,
            usuario.EhDono ? p.Custo : null, p.Estoque, p.FotoUrl)).ToList();
    }
}
