using System.Globalization;
using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class DashboardService(IDashboardQueries queries, IRepository<Produto> produtos, IContextoUsuario usuario)
{
    public static readonly string[] Periodos = ["hoje", "semana", "mes", "ano", "personalizado"];

    public async Task<PainelDadosDto> ObterDadosAsync(string? periodo, DateTime? inicio, DateTime? fim)
    {
        var (chave, de, ate, agrupamento, texto) = CalcularPeriodo(periodo, inicio, fim, Relogio.Agora);
        var empresaId = usuario.EmpresaId;

        // As consultas usam a mesma conexão: rodam em sequência.
        var resumo = await queries.ResumoAsync(empresaId, de, ate);
        var serieBruta = await queries.SerieAsync(empresaId, de, ate, agrupamento);
        var formas = await queries.FormasPagamentoAsync(empresaId, de, ate);
        var mais = await queries.RankingProdutosAsync(empresaId, de, ate, 5, "MAIS");
        var menos = await queries.RankingProdutosAsync(empresaId, de, ate, 5, "MENOS");

        var estoqueBaixo = await produtos.Query()
            .Where(p => p.Ativo && p.Estoque <= p.EstoqueMinimo)
            .OrderBy(p => p.Estoque).ThenBy(p => p.Nome).Take(10)
            .Select(p => new EstoqueBaixoDto(p.Id, p.Nome, p.Estoque, p.EstoqueMinimo))
            .ToListAsync();

        // Só mostra o "menos vendidos" o que não aparece já no "mais vendidos"
        var idsMais = mais.Where(m => m.Qtd > 0).Select(m => m.Id).ToHashSet();
        var menosFiltrado = menos.Where(m => !idsMais.Contains(m.Id)).ToList();

        var limiteSerie = chave == "personalizado" ? ate : Min(ate, Relogio.Agora);
        var serie = PreencherSerie(serieBruta, de, limiteSerie, agrupamento);

        return new PainelDadosDto(chave, texto, de, ate.AddSeconds(-1), resumo, serie, formas, formas.Sum(f => f.Taxas),
            mais.Where(m => m.Qtd > 0).ToList(), menosFiltrado, estoqueBaixo);
    }

    /// <summary>Converte o filtro em intervalo [início, fim) e escolhe o agrupamento do gráfico.</summary>
    public static (string Chave, DateTime Inicio, DateTime Fim, string Agrupamento, string Texto) CalcularPeriodo(
        string? periodo, DateTime? inicio, DateTime? fim, DateTime agora)
    {
        var hoje = agora.Date;
        var cultura = Formatos.PtBr;
        switch (periodo)
        {
            case "semana":
            {
                var diasDesdeSegunda = ((int)hoje.DayOfWeek + 6) % 7;
                var segunda = hoje.AddDays(-diasDesdeSegunda);
                return ("semana", segunda, segunda.AddDays(7), "DIA",
                    $"Semana de {segunda:dd/MM} a {segunda.AddDays(6):dd/MM}");
            }
            case "mes":
            {
                var primeiro = new DateTime(hoje.Year, hoje.Month, 1);
                var mes = primeiro.ToString("MMMM 'de' yyyy", cultura);
                return ("mes", primeiro, primeiro.AddMonths(1), "DIA", char.ToUpper(mes[0], cultura) + mes[1..]);
            }
            case "ano":
            {
                var primeiro = new DateTime(hoje.Year, 1, 1);
                return ("ano", primeiro, primeiro.AddYears(1), "MES", $"Ano de {hoje.Year}");
            }
            case "personalizado" when inicio is not null && fim is not null:
            {
                var de = inicio.Value.Date;
                var ate = fim.Value.Date;
                if (ate < de) (de, ate) = (ate, de);
                ate = ate.AddDays(1);
                var dias = (ate - de).TotalDays;
                var agrupamento = dias <= 1 ? "HORA" : dias <= 62 ? "DIA" : "MES";
                return ("personalizado", de, ate, agrupamento, $"{de:dd/MM/yyyy} a {ate.AddDays(-1):dd/MM/yyyy}");
            }
            default:
                return ("hoje", hoje, hoje.AddDays(1), "HORA", "Hoje, " + hoje.ToString("dd 'de' MMMM", cultura));
        }
    }

    /// <summary>Completa com zero os períodos sem venda e gera os rótulos.</summary>
    public static IReadOnlyList<PontoSerieDto> PreencherSerie(IReadOnlyList<PontoSerieBrutoDto> bruta, DateTime inicio, DateTime fim,
        string agrupamento)
    {
        var porPeriodo = bruta.GroupBy(p => p.Periodo).ToDictionary(g => g.Key, g => (g.Sum(x => x.Faturamento), g.Sum(x => x.Lucro)));
        var cultura = Formatos.PtBr;
        var pontos = new List<PontoSerieDto>();
        var atual = agrupamento switch
        {
            "HORA" => new DateTime(inicio.Year, inicio.Month, inicio.Day, inicio.Hour, 0, 0),
            "MES" => new DateTime(inicio.Year, inicio.Month, 1),
            _ => inicio.Date
        };
        do
        {
            var (fat, lucro) = porPeriodo.GetValueOrDefault(atual);
            var rotulo = agrupamento switch
            {
                "HORA" => atual.ToString("HH'h'", CultureInfo.InvariantCulture),
                "MES" => cultura.TextInfo.ToTitleCase(atual.ToString("MMM/yy", cultura).Replace(".", "")),
                _ => atual.ToString("dd/MM", CultureInfo.InvariantCulture)
            };
            pontos.Add(new PontoSerieDto(rotulo, fat, lucro));
            atual = agrupamento switch { "HORA" => atual.AddHours(1), "MES" => atual.AddMonths(1), _ => atual.AddDays(1) };
        } while (atual < fim && pontos.Count < 400);
        return pontos;
    }

    private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;
}
