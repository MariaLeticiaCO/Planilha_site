using ControleVendas.Application.DTOs;
using ControleVendas.Web.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>Base das telas da área logada.</summary>
[Authorize]
public abstract class AppController : Controller
{
    protected EmpresaContextoDto Empresa => (EmpresaContextoDto)HttpContext.Items[EmpresaFilter.ChaveItems]!;

    protected void Sucesso(string mensagem) => TempData["Sucesso"] = mensagem;
    protected void Erro(string mensagem) => TempData["Erro"] = mensagem;

    protected IActionResult JsonOk(object? dados = null) => Json(new { ok = true, dados });
    protected IActionResult JsonErro(string erro, int status = 400) => StatusCode(status, new { ok = false, erro });

    protected string PrimeiroErro() =>
        ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).FirstOrDefault(m => !string.IsNullOrEmpty(m))
        ?? "Confira os dados informados.";
}
