using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

[Authorize(Roles = "DONO")]
public class ProdutosController(ProdutoService produtos, CategoriaService categorias, IArmazenamentoArquivos arquivos) : AppController
{
    /// <summary>T09 — Produtos (lista).</summary>
    [HttpGet("/produtos")]
    public async Task<IActionResult> Index([FromQuery] FiltroProdutosDto filtro)
    {
        ViewBag.Filtro = filtro;
        ViewBag.Categorias = await categorias.ListarAsync(somenteAtivas: true);
        return View(await produtos.ListarAsync(filtro));
    }

    /// <summary>T10 — Produto (cadastro).</summary>
    [HttpGet("/produtos/novo")]
    public async Task<IActionResult> Novo()
    {
        await CarregarListasAsync();
        return View("Form", new ProdutoDto());
    }

    [HttpGet("/produtos/{id:int}/editar")]
    public async Task<IActionResult> Editar(int id)
    {
        await CarregarListasAsync();
        return View("Form", await produtos.ObterAsync(id));
    }

    [HttpPost("/produtos/novo")]
    [HttpPost("/produtos/{id:int}/editar")]
    public async Task<IActionResult> Salvar(int? id, ProdutoDto dto, IFormFile? foto)
    {
        dto.Id = id ?? 0;
        if (ModelState.IsValid)
        {
            try
            {
                if (foto is { Length: > 0 })
                {
                    await using var stream = foto.OpenReadStream();
                    dto.FotoUrl = await arquivos.SalvarImagemAsync(stream, foto.FileName, "produtos");
                }
                await produtos.SalvarAsync(dto);
                Sucesso(id is null ? "Produto cadastrado." : "Produto atualizado.");
                return Redirect("/produtos");
            }
            catch (RegraNegocioException ex)
            {
                ModelState.AddModelError("", ex.Message);
            }
        }
        await CarregarListasAsync();
        return View("Form", dto);
    }

    [HttpPost("/produtos/{id:int}/ativo")]
    public async Task<IActionResult> AlterarAtivo(int id, bool ativo)
    {
        await produtos.AlterarAtivoAsync(id, ativo);
        Sucesso(ativo ? "Produto reativado." : "Produto desativado.");
        return Redirect("/produtos");
    }

    [HttpPost("/produtos/{id:int}/excluir")]
    public async Task<IActionResult> Excluir(int id)
    {
        var excluido = await produtos.ExcluirAsync(id);
        Sucesso(excluido ? "Produto excluído." : "Este produto já tem vendas, então foi desativado (o histórico continua).");
        return Redirect("/produtos");
    }

    private async Task CarregarListasAsync() => ViewBag.Categorias = await categorias.ListarAsync(somenteAtivas: true);
}
