using ControleVendas.Application.Common;
using ControleVendas.Domain.Enums;

namespace ControleVendas.Application.DTOs;

public record AssinaturaStatusDto(Plano Plano, StatusAssinatura Status, bool Ativa, int DiasRestantesTrial,
    DateTime DataFimTrial, DateTime? DataFimAssinatura, bool GatewaySimulado);

public enum FormaPagamentoAssinatura { PIX, CARTAO }

public class CheckoutDto
{
    public OpcaoPlano Opcao { get; set; }
    public FormaPagamentoAssinatura Forma { get; set; }
    /// <summary>O Asaas exige CPF ou CNPJ para emitir a cobrança.</summary>
    public string? CpfCnpj { get; set; }
}

public record NovaCobrancaGatewayDto(string ClienteId, OpcaoPlano Opcao, decimal Valor, string Descricao,
    FormaPagamentoAssinatura Forma, string ReferenciaExterna);

public record CobrancaGatewayDto(string PagamentoId, string? AssinaturaId, string? LinkPagamento, string? PixQrCodeBase64,
    string? PixCopiaECola, DateTime Vencimento);

public record PagamentoGatewayDto(string Id, DateTime Data, decimal Valor, string Descricao, string Status, string? LinkPagamento);

/// <summary>Evento recebido em /webhook/pagamento (formato do Asaas).</summary>
public class WebhookPagamentoDto
{
    public string? Event { get; set; }
    public WebhookPaymentDto? Payment { get; set; }
    public WebhookSubscriptionDto? Subscription { get; set; }
}

public class WebhookSubscriptionDto
{
    public string? Id { get; set; }
    public string? Customer { get; set; }
    public string? ExternalReference { get; set; }
}

public class WebhookPaymentDto
{
    public string? Id { get; set; }
    public string? Customer { get; set; }
    public string? Subscription { get; set; }
    public decimal Value { get; set; }
    public string? Status { get; set; }
    public string? ExternalReference { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? PaymentDate { get; set; }
}
