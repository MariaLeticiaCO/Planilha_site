using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T06 — Dashboard (Início).</summary>
public class DashboardController(DashboardService dashboard, VendaService vendas) : AppController
{
    [HttpGet("/painel")]
    public async Task<IActionResult> Index()
    {
        // Vendedor não vê lucro: vê só as próprias vendas do dia.
        if (!User.IsInRole("DONO")) return View("Vendedor", await vendas.PainelVendedorAsync());
        return View();
    }

    /// <summary>JSON com cards, série, pizza e rankings.</summary>
    [HttpGet("/painel/dados")]
    public async Task<IActionResult> Dados(string? periodo, DateTime? inicio, DateTime? fim)
    {
        if (!User.IsInRole("DONO")) return Forbid();
        return Json(await dashboard.ObterDadosAsync(periodo, inicio, fim));
    }
}
