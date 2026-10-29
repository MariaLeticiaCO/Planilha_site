using System.Text;
using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class VendaService(
    IRepository<Venda> vendas,
    IProdutoRepository produtos,
    IRepository<FormaPagamento> formas,
    IRepository<Cliente> clientes,
    IUnitOfWork uow,
    EmpresaService empresaService,
    IContextoUsuario usuario)
{
    public const int ItensPorPagina = 20;

    /// <summary>
    /// Registra a venda: calcula taxa, custo e lucro, gera as parcelas do crediário e baixa o estoque,
    /// tudo numa única transação (ou tudo grava, ou nada grava).
    /// </summary>
    public async Task<VendaRegistradaDto> RegistrarAsync(NovaVendaDto dto)
    {
        var empresa = await empresaService.ObterAsync();
        var agora = Relogio.Agora;
        if (!empresa.AssinaturaAtiva(agora))
            throw new RegraNegocioException("Seu teste ou assinatura venceu. Renove para registrar vendas novas.");

        // 1. Pelo menos 1 item (itens repetidos são somados)
        var itensAgrupados = dto.Itens.Where(i => i.Quantidade > 0)
            .GroupBy(i => i.ProdutoId)
            .Select(g => new { ProdutoId = g.Key, Quantidade = g.Sum(i => i.Quantidade) })
            .ToList();
        if (itensAgrupados.Count == 0) throw new RegraNegocioException("Adicione pelo menos 1 produto à venda.");

        // 1. Forma de pagamento ativa
        var forma = await formas.Query().FirstOrDefaultAsync(f => f.Id == dto.FormaPagamentoId && f.Ativo)
                    ?? throw new RegraNegocioException("Escolha uma forma de pagamento ativa.");

        var ids = itensAgrupados.Select(i => i.ProdutoId).ToList();
        var produtosVenda = await produtos.Query().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
        var faltando = ids.FirstOrDefault(id => !produtosVenda.ContainsKey(id) || !produtosVenda[id].Ativo);
        if (faltando != 0) throw new RegraNegocioException("Um dos produtos do carrinho não está mais disponível.");

        // 3. Preço e custo do momento da venda
        var itensVenda = itensAgrupados.Select(i =>
        {
            var p = produtosVenda[i.ProdutoId];
            return new ItemVenda { ProdutoId = p.Id, Quantidade = i.Quantidade, PrecoUnitario = p.PrecoVenda, CustoUnitario = p.Custo };
        }).ToList();

        var valorBruto = CalculadoraLucro.Arredondar(itensVenda.Sum(i => i.Quantidade * i.PrecoUnitario));
        var custoTotal = CalculadoraLucro.Arredondar(itensVenda.Sum(i => i.Quantidade * i.CustoUnitario));

        // 2. Desconto não pode ser maior que o valor bruto
        var desconto = dto.DescontoEmPercentual
            ? CalculadoraLucro.DescontoPercentualEmReais(valorBruto, dto.Desconto)
            : CalculadoraLucro.Arredondar(dto.Desconto);
        if (desconto < 0) throw new RegraNegocioException("O desconto não pode ser negativo.");
        if (desconto > valorBruto) throw new RegraNegocioException("O desconto não pode ser maior que o valor da venda.");

        var taxa = CalculadoraLucro.CalcularTaxa(valorBruto, desconto, forma.TaxaPercentual, forma.TaxaFixa);
        var lucro = CalculadoraLucro.CalcularLucro(valorBruto, desconto, taxa, custoTotal);
        var valorLiquido = valorBruto - desconto;

        // Cliente: obrigatório no crediário
        Cliente? cliente = null;
        if (dto.ClienteId is > 0)
            cliente = await clientes.Query().FirstOrDefaultAsync(c => c.Id == dto.ClienteId)
                      ?? throw new NaoEncontradoException("Cliente");

        var venda = new Venda
        {
            UsuarioId = usuario.UsuarioId,
            ClienteId = cliente?.Id,
            FormaPagamentoId = forma.Id,
            DataVenda = agora,
            ValorBruto = valorBruto,
            Desconto = desconto,
            ValorTaxa = taxa,
            CustoTotal = custoTotal,
            Status = StatusVenda.CONCLUIDA,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim(),
            Itens = itensVenda
        };

        IReadOnlyList<ParcelaGerada> parcelasGeradas = [];
        if (forma.Tipo == TipoPagamento.CREDIARIO)
        {
            if (!empresa.TemRecursosPro) throw new RecursoProException("O crediário");
            if (cliente is null) throw new RegraNegocioException("Venda no crediário exige um cliente.");
            if (valorLiquido <= 0) throw new RegraNegocioException("O valor do crediário precisa ser maior que zero.");
            var primeiro = (dto.PrimeiroVencimento ?? agora.Date.AddDays(GeradorParcelas.IntervaloDias)).Date;
            if (primeiro < agora.Date) throw new RegraNegocioException("O 1º vencimento não pode ser no passado.");
            parcelasGeradas = GeradorParcelas.Gerar(valorLiquido, dto.QtdParcelas, primeiro);
            foreach (var p in parcelasGeradas)
            {
                venda.Parcelas.Add(new ParcelaCrediario
                {
                    ClienteId = cliente.Id,
                    Numero = p.Numero,
                    TotalParcelas = parcelasGeradas.Count,
                    Valor = p.Valor,
                    DataVencimento = p.Vencimento,
                    Status = StatusParcela.ABERTA
                });
            }
        }

        // 7. Estoque negativo gera aviso, mas não bloqueia (configurável)
        var avisos = new List<string>();
        foreach (var item in itensVenda)
        {
            var p = produtosVenda[item.ProdutoId];
            if (p.Estoque - item.Quantidade < 0)
            {
                if (!empresa.PermitirEstoqueNegativo)
                    throw new RegraNegocioException($"Estoque insuficiente de \"{p.Nome}\" (tem {p.Estoque}).");
                avisos.Add($"\"{p.Nome}\" ficou com estoque negativo ({p.Estoque - item.Quantidade}).");
            }
            else if (p.Estoque - item.Quantidade <= p.EstoqueMinimo)
            {
                avisos.Add($"\"{p.Nome}\" chegou ao estoque mínimo ({p.Estoque - item.Quantidade}).");
            }
        }

        // 4 e 5. Venda, itens, parcelas e baixa de estoque numa única transação
        await using (var transacao = await uow.IniciarTransacaoAsync())
        {
            vendas.Adicionar(venda);
            await uow.SalvarAsync();
            foreach (var item in itensVenda)
            {
                await produtos.AjustarEstoqueAsync(item.ProdutoId, -item.Quantidade);
            }
            await transacao.CommitAsync();
        }

        var recibo = MontarRecibo(empresa.Nome, venda.Id, agora,
            itensVenda.Select(i => (produtosVenda[i.ProdutoId].Nome, i.Quantidade, i.PrecoUnitario)),
            valorBruto, desconto, forma.Nome, parcelasGeradas);

        return new VendaRegistradaDto(venda.Id, valorLiquido, usuario.EhDono ? lucro : null, avisos,
            Formatos.LinkWhatsApp(cliente?.Telefone, recibo));
    }

    public async Task<PaginaDto<VendaListaDto>> ListarAsync(FiltroVendasDto filtro)
    {
        var q = QueryVisivel();
        if (filtro.Inicio is not null) q = q.Where(v => v.DataVenda >= filtro.Inicio.Value.Date);
        if (filtro.Fim is not null)
        {
            var fim = filtro.Fim.Value.Date.AddDays(1);
            q = q.Where(v => v.DataVenda < fim);
        }
        if (filtro.FormaPagamentoId is not null) q = q.Where(v => v.FormaPagamentoId == filtro.FormaPagamentoId);
        if (filtro.Status is not null) q = q.Where(v => v.Status == filtro.Status);

        var total = await q.CountAsync();
        var totalPaginas = Math.Max(1, (int)Math.Ceiling(total / (double)ItensPorPagina));
        var pagina = Math.Clamp(filtro.Pagina, 1, totalPaginas);
        var dono = usuario.EhDono;

        var itens = await q.OrderByDescending(v => v.DataVenda).ThenByDescending(v => v.Id)
            .Skip((pagina - 1) * ItensPorPagina).Take(ItensPorPagina)
            .Select(v => new VendaListaDto(v.Id, v.DataVenda, v.Cliente != null ? v.Cliente.Nome : null, v.FormaPagamento!.Nome,
                v.ValorLiquido, dono ? v.Lucro : (decimal?)null, v.Status, v.Usuario!.Nome))
            .ToListAsync();
        return new PaginaDto<VendaListaDto>(itens, pagina, totalPaginas, total);
    }

    public async Task<VendaDetalheDto> ObterDetalheAsync(int id)
    {
        var v = await QueryVisivel()
            .Include(x => x.Itens).ThenInclude(i => i.Produto)
            .Include(x => x.Parcelas)
            .Include(x => x.Cliente)
            .Include(x => x.FormaPagamento)
            .Include(x => x.Usuario)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new NaoEncontradoException("Venda");

        var dono = usuario.EhDono;
        var empresa = await empresaService.ObterAsync();
        var parcelasDto = v.Parcelas.OrderBy(p => p.Numero)
            .Where(p => p.Status != StatusParcela.CANCELADA || v.Status == StatusVenda.CANCELADA)
            .Select(p => new ParcelaDto(p.Id, v.Id, p.ClienteId, v.Cliente?.Nome ?? "", v.Cliente?.Telefone, p.Numero, p.TotalParcelas,
                p.Valor, p.DataVencimento, p.DataPagamento, p.ValorPago, SituacaoParcela(p), DiasAtraso(p)))
            .ToList();

        var recibo = MontarRecibo(empresa.Nome, v.Id, v.DataVenda,
            v.Itens.Select(i => (i.Produto?.Nome ?? "Produto", i.Quantidade, i.PrecoUnitario)),
            v.ValorBruto, v.Desconto, v.FormaPagamento!.Nome,
            v.Parcelas.Where(p => p.Status != StatusParcela.CANCELADA).OrderBy(p => p.Numero)
                .Select(p => new ParcelaGerada(p.Numero, p.Valor, p.DataVencimento)).ToList());

        return new VendaDetalheDto(v.Id, v.DataVenda, v.Usuario?.Nome ?? "", v.ClienteId, v.Cliente?.Nome, v.Cliente?.Telefone,
            v.FormaPagamento.Nome, v.ValorBruto, v.Desconto, v.ValorTaxa, dono ? v.CustoTotal : null, v.ValorLiquido,
            dono ? v.Lucro : null, v.Status, v.DataCancelamento, v.Observacao,
            v.Itens.Select(i => new ItemVendaDetalheDto(i.Produto?.Nome ?? "Produto", i.Quantidade, i.PrecoUnitario,
                dono ? i.CustoUnitario : null)).ToList(),
            parcelasDto, Formatos.LinkWhatsApp(v.Cliente?.Telefone, recibo));
    }

    /// <summary>Venda não é excluída, só cancelada: devolve o estoque e cancela as parcelas abertas.</summary>
    public async Task CancelarAsync(int id)
    {
        if (!usuario.EhDono) throw new RegraNegocioException("Só o dono pode cancelar vendas.");
        var venda = await vendas.Query().Include(v => v.Itens).Include(v => v.Parcelas)
            .FirstOrDefaultAsync(v => v.Id == id) ?? throw new NaoEncontradoException("Venda");
        if (venda.Status == StatusVenda.CANCELADA) throw new RegraNegocioException("Esta venda já foi cancelada.");

        await using var transacao = await uow.IniciarTransacaoAsync();
        venda.Status = StatusVenda.CANCELADA;
        venda.DataCancelamento = Relogio.Agora;
        foreach (var parcela in venda.Parcelas.Where(p => p.Status == StatusParcela.ABERTA))
            parcela.Status = StatusParcela.CANCELADA;
        await uow.SalvarAsync();

        foreach (var item in venda.Itens)
        {
            await produtos.AjustarEstoqueAsync(item.ProdutoId, item.Quantidade);
        }
        await transacao.CommitAsync();
    }

    /// <summary>Início do Vendedor: só as próprias vendas do dia, sem lucro.</summary>
    public async Task<PainelVendedorDto> PainelVendedorAsync()
    {
        var hoje = Relogio.Hoje;
        var amanha = hoje.AddDays(1);
        var lista = await vendas.Query()
            .Where(v => v.UsuarioId == usuario.UsuarioId && v.DataVenda >= hoje && v.DataVenda < amanha)
            .OrderByDescending(v => v.DataVenda)
            .Select(v => new VendaListaDto(v.Id, v.DataVenda, v.Cliente != null ? v.Cliente.Nome : null, v.FormaPagamento!.Nome,
                v.ValorLiquido, null, v.Status, v.Usuario!.Nome))
            .ToListAsync();
        var concluidas = lista.Where(v => v.Status == StatusVenda.CONCLUIDA).ToList();
        return new PainelVendedorDto(concluidas.Count, concluidas.Sum(v => v.Total), lista);
    }

    /// <summary>O Vendedor só enxerga as próprias vendas.</summary>
    private IQueryable<Venda> QueryVisivel() =>
        usuario.EhDono ? vendas.Query() : vendas.Query().Where(v => v.UsuarioId == usuario.UsuarioId);

    private static string SituacaoParcela(ParcelaCrediario p) => p.Status switch
    {
        StatusParcela.PAGA => "PAGA",
        StatusParcela.CANCELADA => "CANCELADA",
        _ => p.DataVencimento.Date < Relogio.Hoje ? "ATRASADA" : "ABERTA"
    };

    private static int DiasAtraso(ParcelaCrediario p) =>
        p.Status == StatusParcela.ABERTA && p.DataVencimento.Date < Relogio.Hoje ? (Relogio.Hoje - p.DataVencimento.Date).Days : 0;

    internal static string MontarRecibo(string empresa, int vendaId, DateTime data,
        IEnumerable<(string Nome, int Qtd, decimal Preco)> itens, decimal bruto, decimal desconto, string forma,
        IReadOnlyList<ParcelaGerada> parcelas)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"*{empresa}*");
        sb.AppendLine($"Recibo da venda nº {vendaId} — {data:dd/MM/yyyy HH:mm}");
        sb.AppendLine();
        foreach (var (nome, qtd, preco) in itens)
            sb.AppendLine($"{qtd}x {nome} — {Formatos.Moeda(qtd * preco)}");
        sb.AppendLine();
        if (desconto > 0)
        {
            sb.AppendLine($"Subtotal: {Formatos.Moeda(bruto)}");
            sb.AppendLine($"Desconto: {Formatos.Moeda(desconto)}");
        }
        sb.AppendLine($"*Total: {Formatos.Moeda(bruto - desconto)}*");
        sb.AppendLine($"Pagamento: {forma}");
        if (parcelas.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine($"Crediário em {parcelas.Count}x:");
            foreach (var p in parcelas)
                sb.AppendLine($"{p.Numero}ª — {Formatos.Moeda(p.Valor)} vence {p.Vencimento:dd/MM/yyyy}");
        }
        sb.AppendLine();
        sb.Append("Obrigado pela preferência! 💜");
        return sb.ToString();
    }
}
