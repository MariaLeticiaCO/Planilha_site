using ControleVendas.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ControleVendas.Infra.Mappings;

// Fluent API espelhando o controle_vendas_schema.sql (nomes de tabela no singular, enums como texto).

public class SetorMap : IEntityTypeConfiguration<Setor>
{
    public void Configure(EntityTypeBuilder<Setor> b)
    {
        b.ToTable("Setor");
        b.Property(x => x.Nome).HasMaxLength(60).IsRequired();
        b.Property(x => x.Icone).HasMaxLength(30);
        b.Property(x => x.CategoriasSugeridas).HasMaxLength(400);
    }
}

public class EmpresaMap : IEntityTypeConfiguration<Empresa>
{
    public void Configure(EntityTypeBuilder<Empresa> b)
    {
        b.ToTable("Empresa");
        b.Property(x => x.Nome).HasMaxLength(120).IsRequired();
        b.Property(x => x.Telefone).HasMaxLength(20);
        b.Property(x => x.LogoUrl).HasMaxLength(300);
        b.Property(x => x.Plano).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.StatusAssinatura).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.GatewayClienteId).HasMaxLength(60);
        b.Property(x => x.GatewayAssinaturaId).HasMaxLength(60);
        b.HasOne(x => x.Setor).WithMany().HasForeignKey(x => x.SetorId);
    }
}

public class UsuarioMap : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> b)
    {
        b.ToTable("Usuario");
        b.Property(x => x.Nome).HasMaxLength(120).IsRequired();
        b.Property(x => x.Email).HasMaxLength(160).IsRequired();
        b.HasIndex(x => x.Email).IsUnique();
        b.Property(x => x.Telefone).HasMaxLength(20);
        b.Property(x => x.SenhaHash).HasMaxLength(300).IsRequired();
        b.Property(x => x.Perfil).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.TokenRecuperacaoHash).HasMaxLength(64).IsUnicode(false);
        b.HasOne(x => x.Empresa).WithMany().HasForeignKey(x => x.EmpresaId);
    }
}

public class CategoriaMap : IEntityTypeConfiguration<Categoria>
{
    public void Configure(EntityTypeBuilder<Categoria> b)
    {
        b.ToTable("Categoria");
        b.Property(x => x.Nome).HasMaxLength(60).IsRequired();
        b.HasIndex(x => x.EmpresaId);
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class ProdutoMap : IEntityTypeConfiguration<Produto>
{
    public void Configure(EntityTypeBuilder<Produto> b)
    {
        b.ToTable("Produto");
        b.Property(x => x.Nome).HasMaxLength(120).IsRequired();
        b.Property(x => x.Codigo).HasMaxLength(40);
        b.Property(x => x.FotoUrl).HasMaxLength(300);
        b.Property(x => x.MargemPercentual)
            .HasPrecision(7, 2)
            .HasComputedColumnSql("CASE WHEN PrecoVenda > 0 THEN ROUND((PrecoVenda - Custo) * 100.0 / PrecoVenda, 2) ELSE 0 END", stored: true);
        b.HasIndex(x => new { x.EmpresaId, x.Ativo });
        b.HasOne(x => x.Categoria).WithMany(c => c.Produtos).HasForeignKey(x => x.CategoriaId).OnDelete(DeleteBehavior.NoAction);
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class FormaPagamentoMap : IEntityTypeConfiguration<FormaPagamento>
{
    public void Configure(EntityTypeBuilder<FormaPagamento> b)
    {
        b.ToTable("FormaPagamento");
        b.Property(x => x.Nome).HasMaxLength(40).IsRequired();
        b.Property(x => x.Tipo).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.TaxaPercentual).HasPrecision(5, 2);
        b.Property(x => x.TaxaFixa).HasPrecision(10, 2);
        b.HasIndex(x => x.EmpresaId);
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class ClienteMap : IEntityTypeConfiguration<Cliente>
{
    public void Configure(EntityTypeBuilder<Cliente> b)
    {
        b.ToTable("Cliente");
        b.Property(x => x.Nome).HasMaxLength(120).IsRequired();
        b.Property(x => x.Telefone).HasMaxLength(20);
        b.Property(x => x.Documento).HasMaxLength(20);
        b.Property(x => x.Observacao).HasMaxLength(500);
        b.HasIndex(x => new { x.EmpresaId, x.Nome });
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class VendaMap : IEntityTypeConfiguration<Venda>
{
    public void Configure(EntityTypeBuilder<Venda> b)
    {
        b.ToTable("Venda");
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.Observacao).HasMaxLength(500);
        b.Property(x => x.ValorLiquido).HasComputedColumnSql("ValorBruto - Desconto", stored: true);
        b.Property(x => x.Lucro).HasComputedColumnSql("ValorBruto - Desconto - ValorTaxa - CustoTotal", stored: true);
        b.HasIndex(x => new { x.EmpresaId, x.DataVenda });
        b.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.NoAction);
        b.HasOne(x => x.Cliente).WithMany().HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.NoAction);
        b.HasOne(x => x.FormaPagamento).WithMany().HasForeignKey(x => x.FormaPagamentoId).OnDelete(DeleteBehavior.NoAction);
        b.HasMany(x => x.Itens).WithOne(i => i.Venda).HasForeignKey(i => i.VendaId).OnDelete(DeleteBehavior.NoAction);
        b.HasMany(x => x.Parcelas).WithOne(p => p.Venda).HasForeignKey(p => p.VendaId).OnDelete(DeleteBehavior.NoAction);
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class ItemVendaMap : IEntityTypeConfiguration<ItemVenda>
{
    public void Configure(EntityTypeBuilder<ItemVenda> b)
    {
        b.ToTable("ItemVenda");
        b.Ignore(x => x.Subtotal);
        b.HasIndex(x => x.VendaId);
        b.HasOne(x => x.Produto).WithMany().HasForeignKey(x => x.ProdutoId).OnDelete(DeleteBehavior.NoAction);
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class ParcelaCrediarioMap : IEntityTypeConfiguration<ParcelaCrediario>
{
    public void Configure(EntityTypeBuilder<ParcelaCrediario> b)
    {
        b.ToTable("ParcelaCrediario");
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.DataVencimento).HasColumnType("date");
        b.HasIndex(x => new { x.EmpresaId, x.Status, x.DataVencimento });
        b.HasOne(x => x.Cliente).WithMany().HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.NoAction);
        b.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class ParcelaCrediarioViewMap : IEntityTypeConfiguration<ParcelaCrediarioView>
{
    public void Configure(EntityTypeBuilder<ParcelaCrediarioView> b)
    {
        b.ToView("vw_ParcelasCrediario");
        b.HasKey(x => x.Id);
    }
}
