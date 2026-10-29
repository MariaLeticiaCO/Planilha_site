using ControleVendas.Domain.Enums;

namespace ControleVendas.Domain.Entities;

public class Usuario : IEntidadeEmpresa
{
    public const int MaxTentativasLogin = 5;

    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public Empresa? Empresa { get; set; }
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Telefone { get; set; }
    public string SenhaHash { get; set; } = "";
    public PerfilUsuario Perfil { get; set; } = PerfilUsuario.DONO;
    public bool Ativo { get; set; } = true;

    public int TentativasFalhas { get; set; }
    public DateTime? BloqueadoAte { get; set; }
    /// <summary>Hash SHA-256 do token de recuperação/convite. O token em si só vai no e-mail.</summary>
    public string? TokenRecuperacaoHash { get; set; }
    public DateTime? TokenExpiraEm { get; set; }

    public DateTime? AceiteTermosEm { get; set; }
    public DateTime? UltimoAcesso { get; set; }
    public DateTime DataCadastro { get; set; }
}
