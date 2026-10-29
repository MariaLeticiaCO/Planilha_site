namespace ControleVendas.Domain.Enums;

/// <summary>Tipo da forma de pagamento. Gravado como texto no banco.</summary>
public enum TipoPagamento
{
    PIX,
    DINHEIRO,
    DEBITO,
    CREDITO,
    CREDIARIO
}

public enum StatusVenda
{
    CONCLUIDA,
    CANCELADA
}

/// <summary>
/// Situação gravada da parcela. ATRASADA não é gravada: é calculada na view
/// vw_ParcelasCrediario (parcela ABERTA com vencimento no passado).
/// </summary>
public enum StatusParcela
{
    ABERTA,
    PAGA,
    CANCELADA
}

public enum Plano
{
    TESTE,
    BASICO,
    PRO
}

public enum StatusAssinatura
{
    TRIAL,
    ATIVA,
    VENCIDA,
    CANCELADA
}

public enum PerfilUsuario
{
    DONO,
    VENDEDOR
}
