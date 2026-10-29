using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T05 — Configuração inicial em 3 passos.</summary>
[Authorize(Roles = "DONO")]
public class OnboardingController(OnboardingService onboarding) : AppController
{
    [HttpGet("/comecar")]
    public async Task<IActionResult> Index()
    {
        if (Empresa.OnboardingConcluido) return Redirect("/painel");
        ViewBag.Setores = await onboarding.ListarSetoresAsync();
        return View(new OnboardingDto { Formas = OnboardingService.FormasPadrao().ToList() });
    }

    [HttpPost("/comecar")]
    public async Task<IActionResult> Index(OnboardingDto dto)
    {
        if (!ModelState.IsValid)
        {
            ViewBag.Setores = await onboarding.ListarSetoresAsync();
            if (dto.Formas.Count == 0) dto.Formas = OnboardingService.FormasPadrao().ToList();
            return View(dto);
        }
        await onboarding.ConcluirAsync(dto);
        Sucesso("Tudo pronto! Registre sua primeira venda e veja o lucro aparecer aqui.");
        return Redirect("/painel");
    }
}
