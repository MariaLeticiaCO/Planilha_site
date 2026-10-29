using System.Security.Claims;
using ControleVendas.Application.Interfaces;

namespace ControleVendas.Web.Infra;

/// <summary>Lê usuário, empresa e perfil das claims do cookie de login.</summary>
public class ContextoUsuarioHttp(IHttpContextAccessor accessor) : IContextoUsuario
{
    public const string ClaimEmpresaId = "empresa_id";
    public const string ClaimOnboarding = "onboarding";

    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public bool Autenticado => User?.Identity?.IsAuthenticated == true && EmpresaId > 0;
    public int EmpresaId => int.TryParse(User?.FindFirstValue(ClaimEmpresaId), out var id) ? id : 0;
    public int UsuarioId => int.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    public bool EhDono => User?.IsInRole("DONO") == true;
}
