using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T14 — Crediário.</summary>
public class CrediarioController(CrediarioService crediario) : AppController
{
    [HttpGet("/crediario")]
    public async Task<IActionResult> Index(string? aba)
    {
        if (!Empresa.TemRecursosPro) return View("SemAcesso");
        aba = aba is CrediarioService.AbaAtrasadas or CrediarioService.AbaPagas or "clientes" ? aba : CrediarioService.AbaAVencer;
        ViewBag.Aba = aba;
        ViewBag.Resumo = await crediario.ResumoAsync();
        if (aba == "clientes") ViewBag.Devedores = await crediario.AgruparPorClienteAsync();
        else ViewBag.Parcelas = await crediario.ListarAsync(aba);
        return View();
    }

    /// <summary>Dar baixa (AJAX).</summary>
    [HttpPost("/crediario/{id:int}/baixa")]
    public async Task<IActionResult> Baixa(int id) => JsonOk(await crediario.DarBaixaAsync(id));

    /// <summary>Redireciona para o link do WhatsApp com a mensagem pronta.</summary>
    [HttpGet("/crediario/{id:int}/cobrar")]
    public async Task<IActionResult> Cobrar(int id) => Redirect(await crediario.LinkCobrancaAsync(id));
}
