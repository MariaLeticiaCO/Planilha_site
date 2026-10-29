using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T15 — Relatórios.</summary>
[Authorize(Roles = "DONO")]
public class RelatoriosController(RelatorioService relatorios) : AppController
{
    [HttpGet("/relatorios")]
    public async Task<IActionResult> Index(string? tipo, DateTime? inicio, DateTime? fim)
    {
        var (de, ate) = Periodo(inicio, fim);
        ViewBag.Tipos = RelatorioService.Tipos;
        ViewBag.Inicio = de;
        ViewBag.Fim = ate;
        var chave = RelatorioService.Tipos.Any(t => t.Chave == tipo) ? tipo! : "vendas";
        return View(await relatorios.GerarAsync(chave, de, ate));
    }

    [HttpGet("/relatorios/exportar")]
    public async Task<IActionResult> Exportar(string tipo, string formato, DateTime? inicio, DateTime? fim)
    {
        var (de, ate) = Periodo(inicio, fim);
        var (conteudo, contentType, nome) = await relatorios.ExportarAsync(tipo, formato, de, ate);
        return File(conteudo, contentType, nome);
    }

    private static (DateTime, DateTime) Periodo(DateTime? inicio, DateTime? fim)
    {
        var hoje = Domain.Rules.Relogio.Hoje;
        return (inicio ?? new DateTime(hoje.Year, hoje.Month, 1), fim ?? hoje);
    }
}
