using ControleVendas.Application.DTOs;
using ControleVendas.Web.Middlewares;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ControleVendas.Web.Filters;

/// <summary>
/// Trial ou assinatura vencida: o usuário entra e vê o dashboard, mas não registra vendas novas.
/// Uso: [ServiceFilter(typeof(AssinaturaAtivaFilter))] nas ações de venda.
/// </summary>
public class AssinaturaAtivaFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.HttpContext.Items[EmpresaFilter.ChaveItems] is not EmpresaContextoDto empresa || empresa.AssinaturaAtiva)
            return;

        if (ErroGlobalMiddleware.EhAjax(context.HttpContext.Request))
        {
            context.Result = new ObjectResult(new
            {
                ok = false,
                erro = "Seu teste grátis ou assinatura venceu. Renove para registrar vendas.",
                redirect = "/assinatura/bloqueio"
            }) { StatusCode = StatusCodes.Status402PaymentRequired };
            return;
        }
        context.Result = new RedirectResult("/assinatura/bloqueio");
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
