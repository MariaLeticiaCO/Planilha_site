using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Application.Services;
using ControleVendas.Domain.Enums;
using ControleVendas.Web.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

public class VendasController(
    VendaService vendas,
    ProdutoService produtos,
    FormaPagamentoService formas,
    EmpresaService empresaService,
    IExportadorRelatorios exportador) : AppController
{
    /// <summary>T07 — Nova venda (PDV).</summary>
    [HttpGet("/vendas/nova")]
    [ServiceFilter(typeof(AssinaturaAtivaFilter))]
    public async Task<IActionResult> Nova()
    {
        var lista = await formas.ListarAsync(somenteAtivas: true);
        // Crediário é do Pro (o teste grátis inclui tudo).
        ViewBag.Formas = Empresa.TemRecursosPro ? lista : lista.Where(f => f.Tipo != TipoPagamento.CREDIARIO).ToList();
        ViewBag.Produtos = await produtos.BuscarParaVendaAsync(null, 60);
        return View();
    }

    [HttpGet("/vendas/buscar-produto")]
    public async Task<IActionResult> BuscarProduto(string? q) => Json(await produtos.BuscarParaVendaAsync(q));

    /// <summary>Finalizar venda (AJAX).</summary>
    [HttpPost("/vendas")]
    [ServiceFilter(typeof(AssinaturaAtivaFilter))]
    public async Task<IActionResult> Registrar([FromBody] NovaVendaDto dto)
    {
        if (!ModelState.IsValid) return JsonErro(PrimeiroErro());
        var resultado = await vendas.RegistrarAsync(dto);
        return JsonOk(resultado);
    }

    /// <summary>T08 — Histórico de vendas.</summary>
    [HttpGet("/vendas/historico")]
    public async Task<IActionResult> Historico([FromQuery] FiltroVendasDto filtro)
    {
        filtro.Inicio ??= DateTime.Today.AddDays(-30);
        filtro.Fim ??= DateTime.Today;
        ViewBag.Filtro = filtro;
        ViewBag.Formas = await formas.ListarAsync();
        return View(await vendas.ListarAsync(filtro));
    }

    [HttpGet("/vendas/{id:int}")]
    public async Task<IActionResult> Detalhe(int id) => View(await vendas.ObterDetalheAsync(id));

    [HttpPost("/vendas/{id:int}/cancelar")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> Cancelar(int id)
    {
        await vendas.CancelarAsync(id);
        Sucesso("Venda cancelada. O estoque foi devolvido e as parcelas em aberto, canceladas.");
        return Redirect($"/vendas/{id}");
    }

    /// <summary>Recibo em PDF (QuestPDF).</summary>
    [HttpGet("/vendas/{id:int}/recibo")]
    public async Task<IActionResult> Recibo(int id)
    {
        var venda = await vendas.ObterDetalheAsync(id);
        var empresa = await empresaService.ObterAsync();
        return File(exportador.GerarReciboPdf(venda, empresa.Nome, empresa.Telefone), "application/pdf", $"recibo-{id}.pdf");
    }
}
