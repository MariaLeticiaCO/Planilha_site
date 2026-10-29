using ControleVendas.Application.Common;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace ControleVendas.Web.Middlewares;

/// <summary>
/// Tratamento global de erro.
/// Regra de negócio: AJAX recebe JSON 400; tela volta para a página anterior com a mensagem.
/// Erro inesperado: registra no Serilog e mostra a página de erro (ou JSON 500).
/// </summary>
public class ErroGlobalMiddleware(RequestDelegate next, ILogger<ErroGlobalMiddleware> logger, ITempDataDictionaryFactory tempDataFactory)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (RegraNegocioException ex) when (!ctx.Response.HasStarted)
        {
            logger.LogInformation("Regra de negócio em {Metodo} {Caminho}: {Mensagem}", ctx.Request.Method, ctx.Request.Path, ex.Message);
            if (EhAjax(ctx.Request))
            {
                ctx.Response.Clear();
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsJsonAsync(new { ok = false, erro = ex.Message });
                return;
            }
            var tempData = tempDataFactory.GetTempData(ctx);
            tempData["Erro"] = ex.Message;
            tempData.Save();
            var voltar = ctx.Request.Headers.Referer.ToString();
            ctx.Response.Redirect(Uri.TryCreate(voltar, UriKind.Absolute, out var uri) && uri.Host == ctx.Request.Host.Host
                ? uri.PathAndQuery : "/painel");
        }
        catch (Exception ex) when (!ctx.Response.HasStarted && ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Erro não tratado em {Metodo} {Caminho}", ctx.Request.Method, ctx.Request.Path);
            ctx.Response.Clear();
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            if (EhAjax(ctx.Request))
            {
                await ctx.Response.WriteAsJsonAsync(new { ok = false, erro = "Algo deu errado. Tente de novo em instantes." });
                return;
            }
            ctx.Response.Redirect("/erro/500");
        }
    }

    public static bool EhAjax(HttpRequest request) =>
        request.Headers.XRequestedWith == "XMLHttpRequest" ||
        request.Headers.Accept.ToString().Contains("application/json") ||
        request.ContentType?.Contains("application/json") == true;
}
