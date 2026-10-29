using System.Security.Cryptography;
using System.Text;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using ControleVendas.Infra.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ControleVendas.Web.Controllers;

/// <summary>Retorno do gateway de pagamento. Valida o token antes de aceitar a chamada.</summary>
[ApiController]
[IgnoreAntiforgeryToken]
public class WebhookController(AssinaturaService assinatura, IOptions<AsaasOptions> asaas, ILogger<WebhookController> logger) : ControllerBase
{
    [HttpPost("/webhook/pagamento")]
    public async Task<IActionResult> Pagamento([FromBody] WebhookPagamentoDto evento)
    {
        var esperado = asaas.Value.TokenWebhook;
        var recebido = Request.Headers["asaas-access-token"].ToString();
        if (string.IsNullOrEmpty(esperado) || !TokensIguais(esperado, recebido))
        {
            logger.LogWarning("Webhook recusado: token inválido (IP {Ip})", HttpContext.Connection.RemoteIpAddress);
            return Unauthorized();
        }

        logger.LogInformation("Webhook {Evento} pagamento {Pagamento}", evento.Event, evento.Payment?.Id);
        await assinatura.ProcessarWebhookAsync(evento);
        return Ok(new { recebido = true });
    }

    private static bool TokensIguais(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}
