using ControleVendas.Application.Common;
using ControleVendas.Application.Services;
using ControleVendas.Web.Controllers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ControleVendas.Web.Filters;

/// <summary>
/// Para o usuário logado: carrega a empresa (usada no layout) e manda para o onboarding
/// quem ainda não fez a configuração inicial.
/// </summary>
public class EmpresaFilter(EmpresaService empresaService) : IAsyncActionFilter
{
    public const string ChaveItems = "EmpresaContexto";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        if (http.User.Identity?.IsAuthenticated != true || context.Controller is WebhookController)
        {
            await next();
            return;
        }

        try
        {
            var empresa = await empresaService.ObterContextoAsync();
            http.Items[ChaveItems] = empresa;

            var ehOnboarding = context.Controller is OnboardingController or AuthController or HomeController;
            if (!empresa.OnboardingConcluido && !ehOnboarding)
            {
                context.Result = new RedirectResult("/comecar");
                return;
            }
        }
        catch (NaoEncontradoException)
        {
            // Conta excluída enquanto o cookie ainda valia.
            await http.SignOutAsync();
            context.Result = new RedirectResult("/login");
            return;
        }

        await next();
    }
}
