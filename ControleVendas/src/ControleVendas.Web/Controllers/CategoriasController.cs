using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T11 — Categorias.</summary>
[Authorize(Roles = "DONO")]
public class CategoriasController(CategoriaService categorias) : AppController
{
    [HttpGet("/categorias")]
    public async Task<IActionResult> Index() => View(await categorias.ListarAsync());

    [HttpPost("/categorias")]
    public async Task<IActionResult> Criar(string nome)
    {
        await categorias.CriarAsync(nome);
        Sucesso("Categoria criada.");
        return Redirect("/categorias");
    }

    [HttpPost("/categorias/{id:int}/renomear")]
    public async Task<IActionResult> Renomear(int id, string nome)
    {
        await categorias.RenomearAsync(id, nome);
        Sucesso("Categoria renomeada.");
        return Redirect("/categorias");
    }

    [HttpPost("/categorias/{id:int}/ativo")]
    public async Task<IActionResult> AlterarAtivo(int id, bool ativo)
    {
        await categorias.AlterarAtivoAsync(id, ativo);
        Sucesso(ativo ? "Categoria reativada." : "Categoria desativada.");
        return Redirect("/categorias");
    }
}
