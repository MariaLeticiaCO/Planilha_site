using System.Security.Claims;
using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using ControleVendas.Web.Infra;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

public class AuthController(AuthService auth) : Controller
{
    /// <summary>T02 — Cadastro.</summary>
    [HttpGet("/cadastro")]
    public IActionResult Cadastro() =>
        User.Identity?.IsAuthenticated == true ? Redirect("/painel") : View(new CadastroDto());

    [HttpPost("/cadastro")]
    public async Task<IActionResult> Cadastro(CadastroDto dto)
    {
        if (!ModelState.IsValid) return View(dto);
        try
        {
            var usuario = await auth.CadastrarAsync(dto);
            await EntrarAsync(HttpContext, usuario, persistente: true);
            return Redirect("/comecar");
        }
        catch (RegraNegocioException ex)
        {
            ModelState.AddModelError("", ex.Message);
            return View(dto);
        }
    }

    /// <summary>T03 — Login.</summary>
    [HttpGet("/login")]
    public IActionResult Login(string? returnUrl) =>
        User.Identity?.IsAuthenticated == true ? Redirect("/painel") : View(new LoginDto { ReturnUrl = returnUrl, LembrarDeMim = true });

    [HttpPost("/login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        if (!ModelState.IsValid) return View(dto);
        var resultado = await auth.AutenticarAsync(dto.Email, dto.Senha);
        if (!resultado.Sucesso)
        {
            ModelState.AddModelError("", resultado.Erro!);
            return View(dto);
        }
        await EntrarAsync(HttpContext, resultado.Usuario!, dto.LembrarDeMim);
        if (!resultado.Usuario!.OnboardingConcluido) return Redirect("/comecar");
        return Url.IsLocalUrl(dto.ReturnUrl) ? Redirect(dto.ReturnUrl) : Redirect("/painel");
    }

    [HttpPost("/logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Redirect("/login");
    }

    /// <summary>T04 — Recuperar senha. Com ?token= mostra o formulário de nova senha.</summary>
    [HttpGet("/recuperar-senha")]
    public async Task<IActionResult> RecuperarSenha(string? token)
    {
        if (string.IsNullOrEmpty(token)) return View(new EsqueciSenhaDto());
        if (!await auth.TokenValidoAsync(token))
        {
            TempData["Erro"] = "Este link expirou ou já foi usado. Peça um novo.";
            return View(new EsqueciSenhaDto());
        }
        return View("RedefinirSenha", new RedefinirSenhaDto { Token = token });
    }

    [HttpPost("/recuperar-senha")]
    public async Task<IActionResult> RecuperarSenha(EsqueciSenhaDto dto)
    {
        if (!ModelState.IsValid) return View(dto);
        await auth.SolicitarRecuperacaoAsync(dto.Email,
            token => Url.Action(nameof(RecuperarSenha), "Auth", new { token }, Request.Scheme)!);
        ViewBag.Enviado = true;
        return View(dto);
    }

    [HttpPost("/recuperar-senha/redefinir")]
    public async Task<IActionResult> RedefinirSenha(RedefinirSenhaDto dto)
    {
        if (!ModelState.IsValid) return View(dto);
        try
        {
            await auth.RedefinirSenhaAsync(dto);
        }
        catch (RegraNegocioException ex)
        {
            ModelState.AddModelError("", ex.Message);
            return View(dto);
        }
        TempData["Sucesso"] = "Senha criada! Agora é só entrar.";
        return Redirect("/login");
    }

    [HttpGet("/acesso-negado")]
    [Authorize]
    public IActionResult AcessoNegado() => View();

    public static async Task EntrarAsync(HttpContext http, UsuarioLogadoDto usuario, bool persistente)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.UsuarioId.ToString()),
            new(ClaimTypes.Name, usuario.Nome),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Perfil),
            new(ContextoUsuarioHttp.ClaimEmpresaId, usuario.EmpresaId.ToString())
        };
        var identidade = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identidade),
            new AuthenticationProperties { IsPersistent = persistente, AllowRefresh = true });
    }
}
