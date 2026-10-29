using ControleVendas.Application.DTOs;
using ControleVendas.Domain.Entities;

namespace ControleVendas.Application.Interfaces;

public interface ISenhaHasher
{
    string Hash(Usuario usuario, string senha);
    bool Verificar(Usuario usuario, string senha);
}

public interface IEmailSender
{
    Task EnviarAsync(string para, string assunto, string html, CancellationToken ct = default);
}

public interface IArmazenamentoArquivos
{
    /// <summary>Salva o arquivo e devolve a URL pública.</summary>
    Task<string> SalvarImagemAsync(Stream conteudo, string nomeOriginal, string pasta, CancellationToken ct = default);
}

/// <summary>Gateway de pagamento do SaaS (Asaas).</summary>
public interface IGatewayPagamento
{
    bool Simulado { get; }
    /// <summary>Cria o cliente no gateway (ou atualiza, se já existir) e devolve o id dele.</summary>
    Task<string> SalvarClienteAsync(string? clienteId, string nome, string email, string? telefone, string? cpfCnpj,
        CancellationToken ct = default);
    Task<CobrancaGatewayDto> CriarCobrancaAsync(NovaCobrancaGatewayDto dados, CancellationToken ct = default);
    Task<IReadOnlyList<PagamentoGatewayDto>> ListarPagamentosAsync(string clienteId, CancellationToken ct = default);
    Task CancelarAssinaturaAsync(string assinaturaId, CancellationToken ct = default);
}

public interface IDashboardQueries
{
    Task<ResumoDashboardDto> ResumoAsync(int empresaId, DateTime inicio, DateTime fim);
    Task<IReadOnlyList<PontoSerieBrutoDto>> SerieAsync(int empresaId, DateTime inicio, DateTime fim, string agrupamento);
    Task<IReadOnlyList<FormaPagamentoDashboardDto>> FormasPagamentoAsync(int empresaId, DateTime inicio, DateTime fim);
    Task<IReadOnlyList<RankingProdutoDto>> RankingProdutosAsync(int empresaId, DateTime inicio, DateTime fim, int top, string ordem);
}

public interface IExportadorRelatorios
{
    byte[] GerarPdf(RelatorioDto relatorio, string nomeEmpresa);
    byte[] GerarExcel(RelatorioDto relatorio);
    byte[] GerarReciboPdf(VendaDetalheDto venda, string nomeEmpresa, string? telefoneEmpresa);
}
