using ControleVendas.Application.Services;
using ControleVendas.Application.Validators;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ControleVendas.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<EmpresaService>();
        services.AddScoped<AuthService>();
        services.AddScoped<OnboardingService>();
        services.AddScoped<ProdutoService>();
        services.AddScoped<CategoriaService>();
        services.AddScoped<FormaPagamentoService>();
        services.AddScoped<ClienteService>();
        services.AddScoped<VendaService>();
        services.AddScoped<CrediarioService>();
        services.AddScoped<DashboardService>();
        services.AddScoped<RelatorioService>();
        services.AddScoped<ConfiguracaoService>();
        services.AddScoped<AssinaturaService>();
        services.AddValidatorsFromAssemblyContaining<CadastroDtoValidator>(includeInternalTypes: true);
        return services;
    }
}
