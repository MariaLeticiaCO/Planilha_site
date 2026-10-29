using ControleVendas.Domain.Enums;

namespace ControleVendas.Application.Common;

/// <summary>Opções vendidas na tela de assinatura (seção 1, "Modelo de cobrança").</summary>
public enum OpcaoPlano
{
    BASICO,
    PRO_MENSAL,
    PRO_ANUAL
}

public record PlanoInfo(OpcaoPlano Opcao, Plano Plano, string Nome, decimal Preco, string Periodicidade, string[] Inclui);

public static class Planos
{
    public static readonly PlanoInfo Basico = new(OpcaoPlano.BASICO, Plano.BASICO, "Básico", 29.90m, "pagamento único",
        ["1 usuário", "Até 50 produtos", "Dashboard de lucro", "Registro de vendas"]);

    public static readonly PlanoInfo ProMensal = new(OpcaoPlano.PRO_MENSAL, Plano.PRO, "Pro mensal", 9.90m, "por mês",
        ["Produtos ilimitados", "Crediário com cobrança no WhatsApp", "3 usuários", "Relatórios em PDF e Excel"]);

    public static readonly PlanoInfo ProAnual = new(OpcaoPlano.PRO_ANUAL, Plano.PRO, "Pro anual", 89.00m, "por ano",
        ["Tudo do Pro mensal", "2 meses e meio grátis"]);

    public static IReadOnlyList<PlanoInfo> Todos { get; } = [Basico, ProMensal, ProAnual];

    public static PlanoInfo Obter(OpcaoPlano opcao) => Todos.First(p => p.Opcao == opcao);
}
