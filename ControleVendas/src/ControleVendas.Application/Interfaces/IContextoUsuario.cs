namespace ControleVendas.Application.Interfaces;

/// <summary>Quem está logado. Vem das claims do cookie (nunca da tela).</summary>
public interface IContextoUsuario
{
    bool Autenticado { get; }
    int EmpresaId { get; }
    int UsuarioId { get; }
    bool EhDono { get; }
}
