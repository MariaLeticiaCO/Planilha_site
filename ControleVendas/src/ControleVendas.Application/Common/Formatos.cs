using System.Globalization;
using System.Text.RegularExpressions;

namespace ControleVendas.Application.Common;

public static partial class Formatos
{
    public static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static string Moeda(decimal valor) => valor.ToString("C2", PtBr);
    public static string Data(DateTime data) => data.ToString("dd/MM/yyyy", PtBr);

    /// <summary>Mantém só os dígitos (telefone, documento).</summary>
    public static string? SoDigitos(string? texto) =>
        string.IsNullOrWhiteSpace(texto) ? null : NaoDigito().Replace(texto, "");

    /// <summary>Telefone no formato que o wa.me espera: 55 + DDD + número.</summary>
    public static string? TelefoneWhatsApp(string? telefone)
    {
        var digitos = SoDigitos(telefone);
        if (string.IsNullOrEmpty(digitos)) return null;
        if (digitos.StartsWith("55") && digitos.Length >= 12) return digitos;
        return "55" + digitos;
    }

    public static string LinkWhatsApp(string? telefone, string mensagem)
    {
        var numero = TelefoneWhatsApp(telefone);
        var texto = Uri.EscapeDataString(mensagem);
        return numero is null ? $"https://wa.me/?text={texto}" : $"https://wa.me/{numero}?text={texto}";
    }

    public static string FormatarTelefone(string? telefone)
    {
        var d = SoDigitos(telefone);
        if (d is null) return "";
        if (d.StartsWith("55") && d.Length >= 12) d = d[2..];
        return d.Length switch
        {
            11 => $"({d[..2]}) {d[2..7]}-{d[7..]}",
            10 => $"({d[..2]}) {d[2..6]}-{d[6..]}",
            _ => d
        };
    }

    [GeneratedRegex("[^0-9]")]
    private static partial Regex NaoDigito();
}
