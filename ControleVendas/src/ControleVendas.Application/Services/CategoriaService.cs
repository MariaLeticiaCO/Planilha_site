using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class CategoriaService(IRepository<Categoria> categorias, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<CategoriaDto>> ListarAsync(bool somenteAtivas = false)
    {
        var q = categorias.Query();
        if (somenteAtivas) q = q.Where(c => c.Ativo);
        return await q.OrderByDescending(c => c.Ativo).ThenBy(c => c.Nome)
            .Select(c => new CategoriaDto(c.Id, c.Nome, c.Ativo, c.Produtos.Count(p => p.Ativo)))
            .ToListAsync();
    }

    public async Task CriarAsync(string nome)
    {
        nome = ValidarNome(nome);
        if (await categorias.Query().AnyAsync(c => c.Nome == nome))
            throw new RegraNegocioException("Já existe uma categoria com este nome.");
        categorias.Adicionar(new Categoria { Nome = nome });
        await uow.SalvarAsync();
    }

    public async Task RenomearAsync(int id, string nome)
    {
        nome = ValidarNome(nome);
        var categoria = await categorias.Query().FirstOrDefaultAsync(c => c.Id == id) ?? throw new NaoEncontradoException("Categoria");
        if (await categorias.Query().AnyAsync(c => c.Nome == nome && c.Id != id))
            throw new RegraNegocioException("Já existe uma categoria com este nome.");
        categoria.Nome = nome;
        await uow.SalvarAsync();
    }

    public async Task AlterarAtivoAsync(int id, bool ativo)
    {
        var categoria = await categorias.Query().FirstOrDefaultAsync(c => c.Id == id) ?? throw new NaoEncontradoException("Categoria");
        categoria.Ativo = ativo;
        await uow.SalvarAsync();
    }

    private static string ValidarNome(string? nome)
    {
        nome = nome?.Trim() ?? "";
        if (nome.Length == 0) throw new RegraNegocioException("Informe o nome da categoria.");
        if (nome.Length > 60) throw new RegraNegocioException("O nome pode ter no máximo 60 caracteres.");
        return nome;
    }
}
