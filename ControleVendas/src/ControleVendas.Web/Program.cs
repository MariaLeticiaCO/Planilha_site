using System.Globalization;
using ControleVendas.Application;
using ControleVendas.Application.Interfaces;
using ControleVendas.Infra;
using ControleVendas.Infra.Data;
using ControleVendas.Web.Filters;
using ControleVendas.Web.Infra;
using ControleVendas.Web.Middlewares;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Serilog;

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    // "Demo" = SQLite local, sem HTTPS (para testar sem SQL Server).
    var ambienteLocal = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Demo");

    // Serilog: console + arquivo diário em logs/
    builder.Host.UseSerilog((ctx, cfg) => cfg
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/controle-vendas-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30));

    builder.Services.AddApplication();
    builder.Services.AddInfra(builder.Configuration);

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<IContextoUsuario, ContextoUsuarioHttp>();
    builder.Services.AddScoped<IArmazenamentoArquivos, ArmazenamentoLocal>();
    builder.Services.AddScoped<EmpresaFilter>();
    builder.Services.AddScoped<AssinaturaAtivaFilter>();

    builder.Services.AddControllersWithViews(o =>
    {
        // [ValidateAntiForgeryToken] em todo POST (o webhook usa [IgnoreAntiforgeryToken]).
        o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
        o.Filters.AddService<EmpresaFilter>();
        var m = o.ModelBindingMessageProvider;
        m.SetValueMustNotBeNullAccessor(_ => "Campo obrigatório.");
        m.SetMissingBindRequiredValueAccessor(_ => "Campo obrigatório.");
        m.SetAttemptedValueIsInvalidAccessor((valor, _) => $"O valor \"{valor}\" não é válido.");
        m.SetValueIsInvalidAccessor(_ => "Valor inválido.");
        m.SetValueMustBeANumberAccessor(_ => "Informe um número válido.");
        m.SetUnknownValueIsInvalidAccessor(_ => "Valor inválido.");
        m.SetMissingRequestBodyRequiredValueAccessor(() => "Dados não enviados.");
    }).AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddFluentValidationClientsideAdapters();
    builder.Services.AddAntiforgery(o => o.HeaderName = "RequestVerificationToken");

    // Login por cookie: HttpOnly, Secure, 7 dias com renovação.
    builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
        .AddCookie(o =>
        {
            o.LoginPath = "/login";
            o.LogoutPath = "/logout";
            o.AccessDeniedPath = "/acesso-negado";
            o.ExpireTimeSpan = TimeSpan.FromDays(7);
            o.SlidingExpiration = true;
            o.Cookie.Name = "cv.auth";
            o.Cookie.HttpOnly = true;
            o.Cookie.SameSite = SameSiteMode.Lax;
            o.Cookie.SecurePolicy = ambienteLocal ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            o.Events.OnRedirectToLogin = ctx => RespostaAjax(ctx.HttpContext, ctx.RedirectUri, StatusCodes.Status401Unauthorized);
            o.Events.OnRedirectToAccessDenied = ctx => RespostaAjax(ctx.HttpContext, ctx.RedirectUri, StatusCodes.Status403Forbidden);
        });
    builder.Services.AddAuthorization();

    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.KnownNetworks.Clear();
        o.KnownProxies.Clear();
    });
    builder.Services.AddHsts(o => o.MaxAge = TimeSpan.FromDays(365));

    var app = builder.Build();

    await DbInicializador.InicializarAsync(app.Services, builder.Configuration.GetValue("Database:CriarSchemaAutomaticamente", false));

    app.UseForwardedHeaders();
    app.UseMiddleware<ErroGlobalMiddleware>();
    if (!ambienteLocal)
    {
        // HTTPS obrigatório e HSTS em produção.
        app.UseHsts();
        app.UseHttpsRedirection();
    }

    var ptBr = new CultureInfo("pt-BR");
    app.UseRequestLocalization(new RequestLocalizationOptions
    {
        DefaultRequestCulture = new RequestCulture(ptBr),
        SupportedCultures = [ptBr],
        SupportedUICultures = [ptBr]
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
        {
            // O service worker precisa ser revalidado sempre.
            if (ctx.File.Name == "service-worker.js") ctx.Context.Response.Headers.CacheControl = "no-cache";
        }
    });
    app.UseSerilogRequestLogging();
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseStatusCodePagesWithReExecute("/erro/{0}");
    app.MapControllers();

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "A aplicação parou de forma inesperada");
}
finally
{
    Log.CloseAndFlush();
}

static Task RespostaAjax(HttpContext ctx, string redirectUri, int status)
{
    if (ErroGlobalMiddleware.EhAjax(ctx.Request))
    {
        ctx.Response.StatusCode = status;
        return ctx.Response.WriteAsJsonAsync(new { ok = false, erro = "Sua sessão expirou. Entre de novo.", redirect = "/login" });
    }
    ctx.Response.Redirect(redirectUri);
    return Task.CompletedTask;
}

public partial class Program;
