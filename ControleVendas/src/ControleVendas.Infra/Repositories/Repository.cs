using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Infra.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ControleVendas.Infra.Repositories;

public class Repository<T>(AppDbContext db) : IRepository<T> where T : class
{
    protected readonly AppDbContext Db = db;

    public IQueryable<T> Query() => Db.Set<T>();
    public IQueryable<T> QuerySemFiltroEmpresa() => Db.Set<T>().IgnoreQueryFilters();

    public async Task<T?> ObterAsync(int id, CancellationToken ct = default) => await Db.Set<T>().FindAsync([id], ct);

    public void Adicionar(T entidade) => Db.Set<T>().Add(entidade);
    public void Remover(T entidade) => Db.Set<T>().Remove(entidade);
}

public class ProdutoRepository(AppDbContext db) : Repository<Produto>(db), IProdutoRepository
{
    public async Task AjustarEstoqueAsync(int produtoId, int delta, CancellationToken ct = default)
    {
        await Db.Produtos.Where(p => p.Id == produtoId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Estoque, p => p.Estoque + delta), ct);
    }
}

public class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    public Task<int> SalvarAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);

    public Task<IDbContextTransaction> IniciarTransacaoAsync(CancellationToken ct = default) =>
        db.Database.BeginTransactionAsync(ct);
}

/// <summary>LGPD: apaga todos os dados da empresa, dos filhos para os pais, numa transação.</summary>
public class ExclusaoConta(AppDbContext db) : IExclusaoConta
{
    public async Task ExcluirTudoAsync(int empresaId, CancellationToken ct = default)
    {
        await using var transacao = await db.Database.BeginTransactionAsync(ct);
        await db.Parcelas.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.ItensVenda.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.Vendas.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.Clientes.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.Produtos.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.Categorias.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.FormasPagamento.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.Usuarios.IgnoreQueryFilters().Where(x => x.EmpresaId == empresaId).ExecuteDeleteAsync(ct);
        await db.Empresas.IgnoreQueryFilters().Where(x => x.Id == empresaId).ExecuteDeleteAsync(ct);
        await transacao.CommitAsync(ct);
    }
}
