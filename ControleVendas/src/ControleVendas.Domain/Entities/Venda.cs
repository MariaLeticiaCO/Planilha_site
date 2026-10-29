using ControleVendas.Domain.Enums;

namespace ControleVendas.Domain.Entities;

/// <summary>Cabeçalho da venda. Venda não é excluída, só cancelada.</summary>
public class Venda : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    /// <summary>Quem registrou a venda (o Vendedor vê só as próprias).</summary>
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public int? ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    public int FormaPagamentoId { get; set; }
    public FormaPagamento? FormaPagamento { get; set; }

    public DateTime DataVenda { get; set; }
    public decimal ValorBruto { get; set; }
    public decimal Desconto { get; set; }
    public decimal ValorTaxa { get; set; }
    public decimal CustoTotal { get; set; }
    /// <summary>Coluna calculada: ValorBruto − Desconto.</summary>
    public decimal ValorLiquido { get; private set; }
    /// <summary>Coluna calculada: ValorBruto − Desconto − ValorTaxa − CustoTotal.</summary>
    public decimal Lucro { get; private set; }

    public StatusVenda Status { get; set; } = StatusVenda.CONCLUIDA;
    public string? Observacao { get; set; }
    public DateTime? DataCancelamento { get; set; }

    public ICollection<ItemVenda> Itens { get; set; } = new List<ItemVenda>();
    public ICollection<ParcelaCrediario> Parcelas { get; set; } = new List<ParcelaCrediario>();
}
