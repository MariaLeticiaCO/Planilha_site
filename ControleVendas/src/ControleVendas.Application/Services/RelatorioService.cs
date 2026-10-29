using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class RelatorioService(
    IRepository<Venda> vendas,
    IRepository<ItemVenda> itens,
    IRepository<ParcelaCrediarioView> parcelas,
    IExportadorRelatorios exportador,
    EmpresaService empresaService)
{
    public static readonly IReadOnlyList<TipoRelatorio> Tipos =
    [
        new("vendas", "Vendas por período", "Faturamento, taxas, custo e lucro dia a dia."),
        new("lucro-produto", "Lucro por produto", "Quanto cada produto vendeu e deixou de lucro."),
        new("lucro-categoria", "Lucro por categoria", "O mesmo, somado por categoria."),
        new("curva-abc", "Curva ABC", "Os produtos que fazem 80% (A), 15% (B) e 5% (C) do faturamento."),
        new("crediario-cliente", "Crediário por cliente", "Quem deve, quanto está atrasado e o próximo vencimento.")
    ];

    public async Task<RelatorioDto> GerarAsync(string tipo, DateTime inicio, DateTime fim)
    {
        var de = inicio.Date;
        var ate = fim.Date.AddDays(1);
        var subtitulo = $"{de:dd/MM/yyyy} a {fim.Date:dd/MM/yyyy}";
        return tipo switch
        {
            "lucro-produto" => await LucroPorProdutoAsync(de, ate, subtitulo),
            "lucro-categoria" => await LucroPorCategoriaAsync(de, ate, subtitulo),
            "curva-abc" => await CurvaAbcAsync(de, ate, subtitulo),
            "crediario-cliente" => await CrediarioPorClienteAsync(),
            _ => await VendasPorPeriodoAsync(de, ate, subtitulo)
        };
    }

    /// <summary>Exportar em PDF ou Excel é do plano Pro.</summary>
    public async Task<(byte[] Conteudo, string ContentType, string NomeArquivo)> ExportarAsync(string tipo, string formato,
        DateTime inicio, DateTime fim)
    {
        await empresaService.ExigirProAsync("Exportar relatórios");
        var relatorio = await GerarAsync(tipo, inicio, fim);
        var empresa = await empresaService.ObterAsync();
        var nome = $"{relatorio.Tipo}-{DateTime.Now:yyyyMMdd-HHmm}";
        return formato == "excel"
            ? (exportador.GerarExcel(relatorio), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nome + ".xlsx")
            : (exportador.GerarPdf(relatorio, empresa.Nome), "application/pdf", nome + ".pdf");
    }

    private async Task<RelatorioDto> VendasPorPeriodoAsync(DateTime de, DateTime ate, string subtitulo)
    {
        var lista = await vendas.Query()
            .Where(v => v.Status == StatusVenda.CONCLUIDA && v.DataVenda >= de && v.DataVenda < ate)
            .Select(v => new { v.DataVenda, v.ValorLiquido, v.ValorTaxa, v.CustoTotal, v.Lucro })
            .ToListAsync();
        var linhas = lista.GroupBy(v => v.DataVenda.Date).OrderBy(g => g.Key)
            .Select(g => new object?[]
            {
                Formatos.Data(g.Key), g.Count(), g.Sum(v => v.ValorLiquido), g.Sum(v => v.ValorTaxa), g.Sum(v => v.CustoTotal),
                g.Sum(v => v.Lucro)
            }).ToList();
        return new RelatorioDto("vendas", "Vendas por período", subtitulo,
            [new("Data"), new("Vendas", TipoColuna.Numero), new("Faturamento", TipoColuna.Moeda), new("Taxas", TipoColuna.Moeda),
             new("Custo", TipoColuna.Moeda), new("Lucro", TipoColuna.Moeda)],
            linhas,
            ["Total", lista.Count, lista.Sum(v => v.ValorLiquido), lista.Sum(v => v.ValorTaxa), lista.Sum(v => v.CustoTotal),
             lista.Sum(v => v.Lucro)]);
    }

    private sealed record LinhaItem(int ProdutoId, string Produto, string Categoria, int Quantidade, decimal Faturamento, decimal Custo);

    private async Task<List<LinhaItem>> ItensDoPeriodoAsync(DateTime de, DateTime ate)
    {
        var brutos = await itens.Query()
            .Where(i => i.Venda!.Status == StatusVenda.CONCLUIDA && i.Venda.DataVenda >= de && i.Venda.DataVenda < ate)
            .Select(i => new
            {
                i.ProdutoId,
                Produto = i.Produto!.Nome,
                Categoria = i.Produto.Categoria != null ? i.Produto.Categoria.Nome : "Sem categoria",
                i.Quantidade, i.PrecoUnitario, i.CustoUnitario
            })
            .ToListAsync();
        return brutos.Select(i => new LinhaItem(i.ProdutoId, i.Produto, i.Categoria, i.Quantidade,
            i.Quantidade * i.PrecoUnitario, i.Quantidade * i.CustoUnitario)).ToList();
    }

    private static decimal Margem(decimal faturamento, decimal custo) =>
        faturamento == 0 ? 0 : Math.Round((faturamento - custo) / faturamento * 100, 1);

    private async Task<RelatorioDto> LucroPorProdutoAsync(DateTime de, DateTime ate, string subtitulo)
    {
        var lista = await ItensDoPeriodoAsync(de, ate);
        var linhas = lista.GroupBy(i => i.ProdutoId)
            .Select(g => new
            {
                Nome = g.First().Produto, Qtd = g.Sum(i => i.Quantidade), Fat = g.Sum(i => i.Faturamento), Custo = g.Sum(i => i.Custo)
            })
            .OrderByDescending(x => x.Fat - x.Custo)
            .Select(x => new object?[] { x.Nome, x.Qtd, x.Fat, x.Custo, x.Fat - x.Custo, Margem(x.Fat, x.Custo) })
            .ToList();
        var fat = lista.Sum(i => i.Faturamento);
        var custo = lista.Sum(i => i.Custo);
        return new RelatorioDto("lucro-produto", "Lucro por produto", subtitulo + " · lucro antes de taxas e descontos",
            [new("Produto"), new("Qtd", TipoColuna.Numero), new("Faturamento", TipoColuna.Moeda), new("Custo", TipoColuna.Moeda),
             new("Lucro", TipoColuna.Moeda), new("Margem", TipoColuna.Percentual)],
            linhas, ["Total", lista.Sum(i => i.Quantidade), fat, custo, fat - custo, Margem(fat, custo)]);
    }

    private async Task<RelatorioDto> LucroPorCategoriaAsync(DateTime de, DateTime ate, string subtitulo)
    {
        var lista = await ItensDoPeriodoAsync(de, ate);
        var linhas = lista.GroupBy(i => i.Categoria)
            .Select(g => new { Nome = g.Key, Qtd = g.Sum(i => i.Quantidade), Fat = g.Sum(i => i.Faturamento), Custo = g.Sum(i => i.Custo) })
            .OrderByDescending(x => x.Fat - x.Custo)
            .Select(x => new object?[] { x.Nome, x.Qtd, x.Fat, x.Custo, x.Fat - x.Custo, Margem(x.Fat, x.Custo) })
            .ToList();
        var fat = lista.Sum(i => i.Faturamento);
        var custo = lista.Sum(i => i.Custo);
        return new RelatorioDto("lucro-categoria", "Lucro por categoria", subtitulo + " · lucro antes de taxas e descontos",
            [new("Categoria"), new("Qtd", TipoColuna.Numero), new("Faturamento", TipoColuna.Moeda), new("Custo", TipoColuna.Moeda),
             new("Lucro", TipoColuna.Moeda), new("Margem", TipoColuna.Percentual)],
            linhas, ["Total", lista.Sum(i => i.Quantidade), fat, custo, fat - custo, Margem(fat, custo)]);
    }

    /// <summary>Curva ABC simples: A até 80% do faturamento acumulado, B até 95%, C o resto.</summary>
    private async Task<RelatorioDto> CurvaAbcAsync(DateTime de, DateTime ate, string subtitulo)
    {
        var lista = await ItensDoPeriodoAsync(de, ate);
        var total = lista.Sum(i => i.Faturamento);
        var produtos = lista.GroupBy(i => i.ProdutoId)
            .Select(g => new { Nome = g.First().Produto, Qtd = g.Sum(i => i.Quantidade), Fat = g.Sum(i => i.Faturamento) })
            .OrderByDescending(x => x.Fat).ToList();

        var acumulado = 0m;
        var linhas = new List<object?[]>();
        foreach (var p in produtos)
        {
            var participacao = total == 0 ? 0 : p.Fat / total * 100;
            var acumuladoAntes = acumulado;
            acumulado += participacao;
            var classe = acumuladoAntes < 80 ? "A" : acumuladoAntes < 95 ? "B" : "C";
            linhas.Add([classe, p.Nome, p.Qtd, p.Fat, Math.Round(participacao, 1), Math.Round(acumulado, 1)]);
        }
        return new RelatorioDto("curva-abc", "Curva ABC de produtos", subtitulo,
            [new("Classe"), new("Produto"), new("Qtd", TipoColuna.Numero), new("Faturamento", TipoColuna.Moeda),
             new("% do total", TipoColuna.Percentual), new("% acumulado", TipoColuna.Percentual)],
            linhas, ["", "Total", lista.Sum(i => i.Quantidade), total, total == 0 ? 0m : 100m, null]);
    }

    private async Task<RelatorioDto> CrediarioPorClienteAsync()
    {
        var abertas = await parcelas.Query().Where(p => p.Situacao != "PAGA")
            .Select(p => new { p.ClienteId, p.ClienteNome, p.ClienteTelefone, p.Valor, p.Situacao, p.DataVencimento })
            .ToListAsync();
        var linhas = abertas.GroupBy(p => p.ClienteId)
            .Select(g => new
            {
                Nome = g.First().ClienteNome, Tel = Formatos.FormatarTelefone(g.First().ClienteTelefone), Qtd = g.Count(),
                Total = g.Sum(p => p.Valor), Atrasado = g.Where(p => p.Situacao == "ATRASADA").Sum(p => p.Valor),
                Proximo = g.Min(p => p.DataVencimento)
            })
            .OrderByDescending(x => x.Atrasado).ThenByDescending(x => x.Total)
            .Select(x => new object?[] { x.Nome, x.Tel, x.Qtd, x.Total, x.Atrasado, Formatos.Data(x.Proximo) })
            .ToList();
        return new RelatorioDto("crediario-cliente", "Crediário por cliente", "Posição em " + Formatos.Data(DateTime.Today),
            [new("Cliente"), new("Telefone"), new("Parcelas", TipoColuna.Numero), new("Total devido", TipoColuna.Moeda),
             new("Atrasado", TipoColuna.Moeda), new("Próx. vencimento")],
            linhas, ["Total", "", abertas.Count, abertas.Sum(p => p.Valor), abertas.Where(p => p.Situacao == "ATRASADA").Sum(p => p.Valor), ""]);
    }
}
