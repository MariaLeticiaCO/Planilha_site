using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T13 — Clientes.</summary>
public class ClientesController(ClienteService clientes) : AppController
{
    [HttpGet("/clientes")]
    public async Task<IActionResult> Index(string? busca)
    {
        ViewBag.Busca = busca;
        return View(await clientes.ListarAsync(busca));
    }

    [HttpGet("/clientes/novo")]
    public IActionResult Novo() => View("Form", new ClienteDto());

    [HttpGet("/clientes/{id:int}/editar")]
    public async Task<IActionResult> Editar(int id) => View("Form", await clientes.ObterAsync(id));

    [HttpPost("/clientes")]
    public async Task<IActionResult> Salvar(ClienteDto dto)
    {
        if (!ModelState.IsValid) return View("Form", dto);
        try
        {
            var salvo = await clientes.SalvarAsync(dto);
            Sucesso("Cliente salvo.");
            return Redirect($"/clientes/{salvo.Id}");
        }
        catch (RegraNegocioException ex)
        {
            ModelState.AddModelError("", ex.Message);
            return View("Form", dto);
        }
    }

    [HttpGet("/clientes/{id:int}")]
    public async Task<IActionResult> Detalhe(int id) => View(await clientes.ObterDetalheAsync(id));

    [HttpPost("/clientes/{id:int}/desativar")]
    public async Task<IActionResult> Desativar(int id)
    {
        await clientes.DesativarAsync(id);
        Sucesso("Cliente removido da lista.");
        return Redirect("/clientes");
    }

    /// <summary>Cadastro rápido no PDV (AJAX).</summary>
    [HttpPost("/clientes/rapido")]
    public async Task<IActionResult> Rapido([FromBody] ClienteDto dto)
    {
        if (!ModelState.IsValid) return JsonErro(PrimeiroErro());
        return JsonOk(await clientes.SalvarAsync(dto));
    }

    [HttpGet("/clientes/buscar")]
    public async Task<IActionResult> Buscar(string? q) => Json(await clientes.BuscarAsync(q));
}
