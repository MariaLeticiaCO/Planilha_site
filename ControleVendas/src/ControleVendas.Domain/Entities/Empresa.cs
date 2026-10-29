using ControleVendas.Domain.Enums;

namespace ControleVendas.Domain.Entities;

/// <summary>Cada cliente do SaaS.</summary>
public class Empresa
{
    public const int DiasTrial = 7;

    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public int? SetorId { get; set; }
    public Setor? Setor { get; set; }
    public string? Telefone { get; set; }
    public string? LogoUrl { get; set; }

    public Plano Plano { get; set; } = Plano.TESTE;
    public StatusAssinatura StatusAssinatura { get; set; } = StatusAssinatura.TRIAL;
    public DateTime DataFimTrial { get; set; }
    /// <summary>Fim do período pago (Pro). Nulo no Básico, que é pagamento único.</summary>
    public DateTime? DataFimAssinatura { get; set; }
    public string? GatewayClienteId { get; set; }
    public string? GatewayAssinaturaId { get; set; }

    /// <summary>Quando falso, a venda com estoque insuficiente é bloqueada. Padrão: só avisa.</summary>
    public bool PermitirEstoqueNegativo { get; set; } = true;
    public bool OnboardingConcluido { get; set; }
    public DateTime DataCadastro { get; set; }

    /// <summary>Trial ou assinatura em dia: pode registrar vendas novas.</summary>
    public bool AssinaturaAtiva(DateTime agora) => StatusAssinatura switch
    {
        StatusAssinatura.TRIAL => DataFimTrial >= agora,
        StatusAssinatura.ATIVA => DataFimAssinatura is null || DataFimAssinatura >= agora,
        // Cancelada continua valendo até o fim do período já pago.
        StatusAssinatura.CANCELADA => DataFimAssinatura is not null && DataFimAssinatura >= agora,
        _ => false
    };

    public int DiasRestantesTrial(DateTime agora) =>
        StatusAssinatura == StatusAssinatura.TRIAL ? Math.Max(0, (int)Math.Ceiling((DataFimTrial - agora).TotalDays)) : 0;

    /// <summary>O teste dá acesso a tudo do Pro.</summary>
    public bool TemRecursosPro => Plano is Plano.PRO or Plano.TESTE;

    public int LimiteProdutos => TemRecursosPro ? int.MaxValue : 50;
    public int LimiteUsuarios => TemRecursosPro ? 3 : 1;
}
