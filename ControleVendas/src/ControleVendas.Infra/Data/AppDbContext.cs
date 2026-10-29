using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Infra.Data;

/// <summary>
/// DbContext com o Global Query Filter por EmpresaId: cada entidade de negócio só devolve as linhas
/// da empresa logada. Ao gravar, o EmpresaId é preenchido aqui (nunca vem da tela).
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options, IContextoUsuario contexto) : DbContext(options)
{
    /// <summary>Lido a cada consulta pelo filtro global (o EF parametriza membros do DbContext).</summary>
    public int EmpresaIdAtual => contexto.Autenticado ? contexto.EmpresaId : 0;

    public DbSet<Setor> Setores => Set<Setor>();
    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<FormaPagamento> FormasPagamento => Set<FormaPagamento>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Venda> Vendas => Set<Venda>();
    public DbSet<ItemVenda> ItensVenda => Set<ItemVenda>();
    public DbSet<ParcelaCrediario> Parcelas => Set<ParcelaCrediario>();
    public DbSet<ParcelaCrediarioView> ParcelasView => Set<ParcelaCrediarioView>();

    public bool EhSqlServer => Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer";

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<decimal>().HavePrecision(12, 2);
        // SQLite (modo de demonstração) não soma/ordena decimal: guarda como REAL.
        if (!EhSqlServer) builder.Properties<decimal>().HaveConversion<double>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<Usuario>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<Categoria>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<Produto>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<FormaPagamento>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<Cliente>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<Venda>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<ItemVenda>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<ParcelaCrediario>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        modelBuilder.Entity<ParcelaCrediarioView>().HasQueryFilter(x => x.EmpresaId == EmpresaIdAtual);
        // A empresa logada só enxerga a si mesma.
        modelBuilder.Entity<Empresa>().HasQueryFilter(x => x.Id == EmpresaIdAtual);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        PreencherEmpresaId();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        PreencherEmpresaId();
        return base.SaveChanges();
    }

    private void PreencherEmpresaId()
    {
        foreach (var entry in ChangeTracker.Entries<IEntidadeEmpresa>())
        {
            if (entry.State == EntityState.Added && contexto.Autenticado)
            {
                entry.Entity.EmpresaId = contexto.EmpresaId;
            }
            else if (entry.State == EntityState.Modified)
            {
                // Ninguém troca uma linha de empresa.
                entry.Property(e => e.EmpresaId).IsModified = false;
            }

            if (entry.State == EntityState.Added && entry.Entity.EmpresaId == 0)
                throw new InvalidOperationException($"{entry.Entity.GetType().Name} sem EmpresaId.");
        }
    }
}
