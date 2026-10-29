using ClosedXML.Excel;
using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ControleVendas.Infra.Exports;

/// <summary>Recibo e relatórios em PDF (QuestPDF) e Excel (ClosedXML).</summary>
public class ExportadorRelatorios : IExportadorRelatorios
{
    private const string CorPrimaria = "#7C3AED";

    static ExportadorRelatorios()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GerarPdf(RelatorioDto relatorio, string nomeEmpresa) =>
        Document.Create(doc => doc.Page(page =>
        {
            page.Size(relatorio.Colunas.Count > 5 ? PageSizes.A4.Landscape() : PageSizes.A4);
            page.Margin(30);
            page.DefaultTextStyle(t => t.FontSize(9));

            page.Header().Column(col =>
            {
                col.Item().Text(nomeEmpresa).FontSize(10).FontColor(Colors.Grey.Darken1);
                col.Item().Text(relatorio.Titulo).FontSize(16).Bold().FontColor(CorPrimaria);
                col.Item().Text(relatorio.Subtitulo).FontColor(Colors.Grey.Darken1);
                col.Item().PaddingBottom(8);
            });

            page.Content().Table(tabela =>
            {
                tabela.ColumnsDefinition(c =>
                {
                    foreach (var coluna in relatorio.Colunas)
                    {
                        if (coluna.Tipo == TipoColuna.Texto) c.RelativeColumn(2);
                        else c.RelativeColumn();
                    }
                });

                tabela.Header(h =>
                {
                    foreach (var coluna in relatorio.Colunas)
                    {
                        var celula = h.Cell().Background(CorPrimaria).Padding(4);
                        var texto = coluna.Tipo == TipoColuna.Texto ? celula.AlignLeft() : celula.AlignRight();
                        texto.Text(coluna.Titulo).FontColor(Colors.White).Bold();
                    }
                });

                var zebra = false;
                foreach (var linha in relatorio.Linhas)
                {
                    var fundo = zebra ? Colors.Grey.Lighten4 : Colors.White;
                    zebra = !zebra;
                    for (var i = 0; i < relatorio.Colunas.Count; i++)
                        Celula(tabela.Cell().Background(fundo), relatorio.Colunas[i], linha.ElementAtOrDefault(i), false);
                }

                if (relatorio.Totais is not null)
                {
                    for (var i = 0; i < relatorio.Colunas.Count; i++)
                        Celula(tabela.Cell().BorderTop(1).BorderColor(Colors.Grey.Medium), relatorio.Colunas[i],
                            relatorio.Totais.ElementAtOrDefault(i), true);
                }
            });

            page.Footer().AlignRight().Text(t =>
            {
                t.Span($"Gerado em {DateTime.Now:dd/MM/yyyy HH:mm} · página ").FontColor(Colors.Grey.Darken1);
                t.CurrentPageNumber();
                t.Span(" de ");
                t.TotalPages();
            });
        })).GeneratePdf();

    private static void Celula(IContainer container, ColunaRelatorio coluna, object? valor, bool negrito)
    {
        var c = container.Padding(4);
        c = coluna.Tipo == TipoColuna.Texto ? c.AlignLeft() : c.AlignRight();
        var texto = c.Text(FormatarValor(coluna.Tipo, valor));
        if (negrito) texto.Bold();
    }

    public static string FormatarValor(TipoColuna tipo, object? valor) => valor switch
    {
        null => "",
        decimal d when tipo == TipoColuna.Moeda => Formatos.Moeda(d),
        decimal d when tipo == TipoColuna.Percentual => d.ToString("N1", Formatos.PtBr) + "%",
        decimal d => d.ToString("N0", Formatos.PtBr),
        int n => n.ToString("N0", Formatos.PtBr),
        _ => valor.ToString() ?? ""
    };

    public byte[] GerarExcel(RelatorioDto relatorio)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add(relatorio.Titulo.Length > 31 ? relatorio.Titulo[..31] : relatorio.Titulo);
        ws.Cell(1, 1).Value = relatorio.Titulo;
        ws.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(14);
        ws.Cell(2, 1).Value = relatorio.Subtitulo;

        const int linhaCabecalho = 4;
        for (var i = 0; i < relatorio.Colunas.Count; i++)
        {
            var cel = ws.Cell(linhaCabecalho, i + 1);
            cel.Value = relatorio.Colunas[i].Titulo;
            cel.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromHtml(CorPrimaria));
        }

        var linhaAtual = linhaCabecalho + 1;
        foreach (var linha in relatorio.Linhas)
            EscreverLinha(ws, linhaAtual++, relatorio.Colunas, linha);
        if (relatorio.Totais is not null)
        {
            EscreverLinha(ws, linhaAtual, relatorio.Colunas, relatorio.Totais);
            ws.Row(linhaAtual).Style.Font.SetBold();
        }

        ws.Columns().AdjustToContents();
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static void EscreverLinha(IXLWorksheet ws, int linha, IReadOnlyList<ColunaRelatorio> colunas, object?[] valores)
    {
        for (var i = 0; i < colunas.Count; i++)
        {
            var cel = ws.Cell(linha, i + 1);
            switch (valores.ElementAtOrDefault(i))
            {
                case decimal d when colunas[i].Tipo == TipoColuna.Percentual:
                    cel.Value = d / 100;
                    cel.Style.NumberFormat.Format = "0.0%";
                    break;
                case decimal d:
                    cel.Value = d;
                    cel.Style.NumberFormat.Format = colunas[i].Tipo == TipoColuna.Moeda ? "\"R$\" #,##0.00" : "#,##0";
                    break;
                case int n:
                    cel.Value = n;
                    break;
                case null:
                    break;
                case var v:
                    cel.Value = v.ToString();
                    break;
            }
        }
    }

    public byte[] GerarReciboPdf(VendaDetalheDto venda, string nomeEmpresa, string? telefoneEmpresa) =>
        Document.Create(doc => doc.Page(page =>
        {
            page.Size(new PageSize(226, 600)); // bobina de 80 mm
            page.Margin(14);
            page.DefaultTextStyle(t => t.FontSize(8));
            page.Content().Column(col =>
            {
                col.Spacing(3);
                col.Item().AlignCenter().Text(nomeEmpresa).FontSize(11).Bold();
                if (!string.IsNullOrEmpty(telefoneEmpresa))
                    col.Item().AlignCenter().Text(Formatos.FormatarTelefone(telefoneEmpresa));
                col.Item().AlignCenter().Text($"Recibo da venda nº {venda.Id}").Bold();
                col.Item().AlignCenter().Text(venda.DataVenda.ToString("dd/MM/yyyy HH:mm"));
                if (venda.Cliente is not null) col.Item().Text($"Cliente: {venda.Cliente}");
                col.Item().LineHorizontal(0.5f);
                foreach (var item in venda.Itens)
                {
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Text($"{item.Quantidade}x {item.Produto}");
                        r.AutoItem().Text(Formatos.Moeda(item.Subtotal));
                    });
                }
                col.Item().LineHorizontal(0.5f);
                if (venda.Desconto > 0)
                {
                    LinhaValor(col, "Subtotal", venda.ValorBruto, false);
                    LinhaValor(col, "Desconto", -venda.Desconto, false);
                }
                LinhaValor(col, "Total", venda.ValorLiquido, true);
                col.Item().Text($"Pagamento: {venda.FormaPagamento}");
                if (venda.Parcelas.Count > 0)
                {
                    col.Item().PaddingTop(4).Text($"Crediário em {venda.Parcelas.Count}x").Bold();
                    foreach (var p in venda.Parcelas)
                        col.Item().Text($"{p.Numero}ª  {Formatos.Moeda(p.Valor)}  vence {p.DataVencimento:dd/MM/yyyy}");
                }
                if (venda.Status == Domain.Enums.StatusVenda.CANCELADA)
                    col.Item().PaddingTop(6).AlignCenter().Text("VENDA CANCELADA").Bold().FontColor(Colors.Red.Medium);
                col.Item().PaddingTop(8).AlignCenter().Text("Obrigado pela preferência!");
            });
        })).GeneratePdf();

    private static void LinhaValor(ColumnDescriptor col, string rotulo, decimal valor, bool negrito) =>
        col.Item().Row(r =>
        {
            var t1 = r.RelativeItem().Text(rotulo);
            var t2 = r.AutoItem().Text(Formatos.Moeda(valor));
            if (negrito) { t1.Bold(); t2.Bold(); }
        });
}
