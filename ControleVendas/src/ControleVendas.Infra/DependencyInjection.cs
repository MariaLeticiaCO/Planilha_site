using ControleVendas.Application.Interfaces;
using ControleVendas.Infra.Data;
using ControleVendas.Infra.Email;
using ControleVendas.Infra.Exports;
using ControleVendas.Infra.Payments;
using ControleVendas.Infra.Queries;
using ControleVendas.Infra.Repositories;
using ControleVendas.Infra.Seguranca;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ControleVendas.Infra;

public static class DependencyInjection
{
    public static IServiceCollection AddInfra(this IServiceCollection services, IConfiguration config)
    {
        var provider = config["Database:Provider"] ?? "SqlServer";
        var conexao = config.GetConnectionString("Default")
                      ?? throw new InvalidOperationException("Configure ConnectionStrings:Default.");
        var sqlite = provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<AppDbContext>(o =>
        {
            if (sqlite) o.UseSqlite(conexao);
            else o.UseSqlServer(conexao, sql => sql.EnableRetryOnFailure(3));
        });

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IProdutoRepository, ProdutoRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IExclusaoConta, ExclusaoConta>();

        if (sqlite) services.AddScoped<IDashboardQueries, DashboardQueriesLinq>();
        else services.AddScoped<IDashboardQueries, DashboardQueries>();

        services.AddSingleton<ISenhaHasher, SenhaHasher>();
        services.AddSingleton<IExportadorRelatorios, ExportadorRelatorios>();

        services.Configure<SmtpOptions>(config.GetSection("Smtp"));
        services.AddScoped<IEmailSender, EmailSender>();

        services.Configure<AsaasOptions>(config.GetSection("Asaas"));
        var asaas = config.GetSection("Asaas").Get<AsaasOptions>() ?? new AsaasOptions();
        if (asaas.Configurado) services.AddHttpClient<IGatewayPagamento, AsaasClient>();
        else services.AddSingleton<IGatewayPagamento, GatewaySimulado>();

        return services;
    }
}
