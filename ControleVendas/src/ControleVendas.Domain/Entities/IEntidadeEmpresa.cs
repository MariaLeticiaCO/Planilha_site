namespace ControleVendas.Domain.Entities;

/// <summary>
/// Marca as entidades de negócio que pertencem a uma empresa (cliente do SaaS).
/// O AppDbContext aplica o filtro global por EmpresaId e preenche o campo ao gravar.
/// </summary>
public interface IEntidadeEmpresa
{
    int EmpresaId { get; set; }
}
