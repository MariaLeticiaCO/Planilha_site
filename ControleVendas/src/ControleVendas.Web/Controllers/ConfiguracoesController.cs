using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T16 — Configurações. O Vendedor só acessa o próprio perfil e a troca de senha.</summary>
public class ConfiguracoesController(
    ConfiguracaoService config,
    OnboardingService onboarding,
    AuthService auth,
    IArmazenamentoArquivos arquivos,
    IContextoUsuario usuario) : AppController
{
    [HttpGet("/configuracoes")]
    public async Task<IActionResult> Index()
    {
        ViewBag.Perfil = await config.ObterPerfilAsync();
        if (User.IsInRole("DONO"))
        {
            ViewBag.Negocio = await config.ObterNegocioAsync();
            ViewBag.Setores = await onboarding.ListarSetoresAsync();
            ViewBag.Usuarios = await config.ListarUsuariosAsync();
        }
        return View();
    }

    [HttpPost("/configuracoes/negocio")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> Negocio(NegocioDto dto, IFormFile? logo)
    {
        if (!ModelState.IsValid)
        {
            Erro(PrimeiroErro());
            return Redirect("/configuracoes");
        }
        dto.LogoUrl = null;
        if (logo is { Length: > 0 })
        {
            await using var stream = logo.OpenReadStream();
            dto.LogoUrl = await arquivos.SalvarImagemAsync(stream, logo.FileName, "logo");
        }
        await config.SalvarNegocioAsync(dto);
        Sucesso("Dados do negócio salvos.");
        return Redirect("/configuracoes");
    }

    [HttpPost("/configuracoes/perfil")]
    public async Task<IActionResult> Perfil(PerfilDto dto)
    {
        if (!ModelState.IsValid)
        {
            Erro(PrimeiroErro());
            return Redirect("/configuracoes#perfil");
        }
        await config.SalvarPerfilAsync(dto);
        // Renova o cookie com o nome/e-mail novos.
        var logado = await auth.ObterUsuarioLogadoAsync(usuario.UsuarioId);
        if (logado is not null) await AuthController.EntrarAsync(HttpContext, logado, persistente: true);
        Sucesso("Perfil atualizado.");
        return Redirect("/configuracoes#perfil");
    }

    [HttpPost("/configuracoes/senha")]
    public async Task<IActionResult> Senha(TrocarSenhaDto dto)
    {
        if (!ModelState.IsValid)
        {
            Erro(PrimeiroErro());
            return Redirect("/configuracoes#senha");
        }
        await auth.TrocarSenhaAsync(usuario.UsuarioId, dto);
        Sucesso("Senha alterada.");
        return Redirect("/configuracoes#senha");
    }

    [HttpPost("/configuracoes/usuarios/convidar")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> Convidar(ConviteVendedorDto dto)
    {
        if (!ModelState.IsValid)
        {
            Erro(PrimeiroErro());
            return Redirect("/configuracoes#usuarios");
        }
        await config.ConvidarVendedorAsync(dto,
            token => Url.Action("RecuperarSenha", "Auth", new { token }, Request.Scheme)!);
        Sucesso($"Convite enviado para {dto.Email}.");
        return Redirect("/configuracoes#usuarios");
    }

    [HttpPost("/configuracoes/usuarios/{id:int}/ativo")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> AlterarUsuario(int id, bool ativo)
    {
        await config.AlterarAtivoUsuarioAsync(id, ativo);
        Sucesso(ativo ? "Usuário reativado." : "Usuário desativado.");
        return Redirect("/configuracoes#usuarios");
    }

    /// <summary>LGPD: excluir a conta e os dados.</summary>
    [HttpPost("/configuracoes/excluir-conta")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> ExcluirConta(string senha, string confirmacao)
    {
        if (confirmacao?.Trim().ToUpperInvariant() != "EXCLUIR")
            throw new RegraNegocioException("Digite EXCLUIR para confirmar.");
        await config.ExcluirContaAsync(senha);
        await HttpContext.SignOutAsync();
        TempData["Sucesso"] = "Sua conta e todos os dados foram excluídos.";
        return Redirect("/login");
    }
}
