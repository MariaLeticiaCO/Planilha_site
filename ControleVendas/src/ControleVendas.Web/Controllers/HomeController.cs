using ControleVendas.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

public class HomeController : Controller
{
    /// <summary>T01 — Landing page.</summary>
    [HttpGet("/")]
    public IActionResult Index()
    {
        if (User.Identity?.IsAuthenticated == true) return Redirect("/painel");
        return View(Planos.Todos);
    }

    [HttpGet("/termos")]
    public IActionResult Termos() => View();

    [HttpGet("/privacidade")]
    public IActionResult Privacidade() => View();

    /// <summary>Página mostrada pelo service worker quando não há internet.</summary>
    [HttpGet("/offline")]
    public IActionResult Offline() => View();

    /// <summary>Também atende o re-execute de POSTs que falharam (UseStatusCodePagesWithReExecute).</summary>
    [Route("/erro/{codigo:int?}")]
    [IgnoreAntiforgeryToken]
    public IActionResult Erro(int? codigo)
    {
        ViewBag.Codigo = codigo ?? 500;
        return View();
    }
}
