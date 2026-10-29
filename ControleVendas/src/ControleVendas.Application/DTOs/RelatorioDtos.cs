namespace ControleVendas.Application.DTOs;

public enum TipoColuna { Texto, Numero, Moeda, Percentual }

public record ColunaRelatorio(string Titulo, TipoColuna Tipo = TipoColuna.Texto);

/// <summary>Relatório tabular genérico: a mesma estrutura alimenta a tela, o PDF e o Excel.</summary>
public record RelatorioDto(string Tipo, string Titulo, string Subtitulo, IReadOnlyList<ColunaRelatorio> Colunas,
    IReadOnlyList<object?[]> Linhas, object?[]? Totais);

public record TipoRelatorio(string Chave, string Nome, string Descricao);
