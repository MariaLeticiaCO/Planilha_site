using System.Net;
using System.Net.Mail;
using ControleVendas.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ControleVendas.Infra.Email;

public class SmtpOptions
{
    public string? Host { get; set; }
    public int Porta { get; set; } = 587;
    public string? Usuario { get; set; }
    public string? Senha { get; set; }
    public string Remetente { get; set; } = "nao-responda@controledevendas.app";
    public string NomeRemetente { get; set; } = "Controle de Vendas";
    public bool UsarSsl { get; set; } = true;
}

/// <summary>
/// Envia por SMTP (Brevo ou SendGrid). Sem SMTP configurado (desenvolvimento), só registra o e-mail no log.
/// </summary>
public class EmailSender(IOptions<SmtpOptions> options, ILogger<EmailSender> logger) : IEmailSender
{
    public async Task EnviarAsync(string para, string assunto, string html, CancellationToken ct = default)
    {
        var cfg = options.Value;
        if (string.IsNullOrWhiteSpace(cfg.Host))
        {
            logger.LogWarning("SMTP não configurado. E-mail para {Para} — {Assunto}:\n{Html}", para, assunto, html);
            return;
        }

        using var mensagem = new MailMessage
        {
            From = new MailAddress(cfg.Remetente, cfg.NomeRemetente),
            Subject = assunto,
            Body = html,
            IsBodyHtml = true
        };
        mensagem.To.Add(para);

        using var smtp = new SmtpClient(cfg.Host, cfg.Porta)
        {
            EnableSsl = cfg.UsarSsl,
            Credentials = string.IsNullOrEmpty(cfg.Usuario) ? null : new NetworkCredential(cfg.Usuario, cfg.Senha)
        };
        await smtp.SendMailAsync(mensagem, ct);
    }
}
