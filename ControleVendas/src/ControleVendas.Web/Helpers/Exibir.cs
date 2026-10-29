using ControleVendas.Application.Common;

namespace ControleVendas.Web.Helpers;

/// <summary>Formatação usada nas views.</summary>
public static class Exibir
{
    public static string Moeda(decimal valor) => Formatos.Moeda(valor);
    public static string Moeda(decimal? valor) => valor is null ? "—" : Formatos.Moeda(valor.Value);
    public static string Data(DateTime data) => data.ToString("dd/MM/yyyy");
    public static string DataHora(DateTime data) => data.ToString("dd/MM/yyyy HH:mm");
    public static string Telefone(string? tel) => Formatos.FormatarTelefone(tel);
    public static string Numero(decimal valor) => valor.ToString("N2", Formatos.PtBr);
    public static string Percentual(decimal valor) => valor.ToString("N1", Formatos.PtBr) + "%";

    /// <summary>Margem colorida: verde acima de 30%, amarelo de 15% a 30%, vermelho abaixo.</summary>
    public static string ClasseMargem(decimal margem) => margem > 30 ? "chip-verde" : margem >= 15 ? "chip-amarelo" : "chip-vermelho";

    public static string ClasseSituacao(string situacao) => situacao switch
    {
        "PAGA" => "chip-verde",
        "ATRASADA" => "chip-vermelho",
        "CANCELADA" => "chip-cinza",
        _ => "chip-amarelo"
    };

    public static string NomeSituacao(string situacao) => situacao switch
    {
        "PAGA" => "Paga",
        "ATRASADA" => "Atrasada",
        "CANCELADA" => "Cancelada",
        _ => "A vencer"
    };

    public static string Iniciais(string nome)
    {
        var partes = nome.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return partes.Length switch
        {
            0 => "?",
            1 => partes[0][..1].ToUpperInvariant(),
            _ => (partes[0][..1] + partes[^1][..1]).ToUpperInvariant()
        };
    }

    public static string IconeForma(Domain.Enums.TipoPagamento tipo) => tipo switch
    {
        Domain.Enums.TipoPagamento.PIX => "pix",
        Domain.Enums.TipoPagamento.DINHEIRO => "dinheiro",
        Domain.Enums.TipoPagamento.CREDIARIO => "crediario",
        _ => "cartao"
    };
}
