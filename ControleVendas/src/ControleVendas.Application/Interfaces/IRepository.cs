using Microsoft.EntityFrameworkCore.Storage;
using ControleVendas.Domain.Entities;

namespace ControleVendas.Application.Interfaces;

/// <summary>Repositório genérico. As consultas já vêm filtradas pela empresa logada.</summary>
public interface IRepository<T> where T : class
{
    IQueryable<T> Query();
    /// <summary>Ignora o filtro por empresa. Use só onde não há empresa logada (login, webhook).</summary>
    IQueryable<T> QuerySemFiltroEmpresa();
    Task<T?> ObterAsync(int id, CancellationToken ct = default);
    void Adicionar(T entidade);
    void Remover(T entidade);
}

public interface IUnitOfWork
{
    Task<int> SalvarAsync(CancellationToken ct = default);
    Task<IDbContextTransaction> IniciarTransacaoAsync(CancellationToken ct = default);
}

public interface IProdutoRepository : IRepository<Produto>
{
    /// <summary>Soma <paramref name="delta"/> ao estoque direto no banco (atômico, dentro da transação atual).</summary>
    Task AjustarEstoqueAsync(int produtoId, int delta, CancellationToken ct = default);
}
