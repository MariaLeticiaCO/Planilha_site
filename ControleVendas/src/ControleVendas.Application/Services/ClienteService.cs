using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class ClienteService(
    IRepository<Cliente> clientes,
    IRepository<ParcelaCrediarioView> parcelas,
    IRepository<Venda> vendas,
    IUnitOfWork uow,
    IContextoUsuario usuario)
{
    public async Task<IReadOnlyList<ClienteListaDto>> ListarAsync(string? busca)
    {
        var q = clientes.Query().Where(c => c.Ativo);
        if (!string.IsNullOrWhiteSpace(busca))
        {
            var b = busca.Trim();
            var digitos = Formatos.SoDigitos(b);
            q = q.Where(c => c.Nome.Contains(b) || (!string.IsNullOrEmpty(digitos) && c.Telefone != null && c.Telefone.Contains(digitos)));
        }
        var lista = await q.OrderBy(c => c.Nome).Select(c => new { c.Id, c.Nome, c.Telefone }).Take(500).ToListAsync();

        var ids = lista.Select(c => c.Id).ToList();
        var devidos = await parcelas.Query()
            .Where(p => ids.Contains(p.ClienteId) && p.Situacao != "PAGA")
            .Select(p => new { p.ClienteId, p.Valor, p.Situacao })
            .ToListAsync();

        return lista.Select(c => new ClienteListaDto(c.Id, c.Nome, c.Telefone,
                devidos.Where(d => d.ClienteId == c.Id).Sum(d => d.Valor),
                devidos.Where(d => d.ClienteId == c.Id && d.Situacao == "ATRASADA").Sum(d => d.Valor)))
            .ToList();
    }

    /// <summary>Busca rápida para o PDV.</summary>
    public async Task<IReadOnlyList<ClienteDto>> BuscarAsync(string? termo)
    {
        var q = clientes.Query().Where(c => c.Ativo);
        if (!string.IsNullOrWhiteSpace(termo))
        {
            var t = termo.Trim();
            var digitos = Formatos.SoDigitos(t);
            q = q.Where(c => c.Nome.Contains(t) || (!string.IsNullOrEmpty(digitos) && c.Telefone != null && c.Telefone.Contains(digitos)));
        }
        return await q.OrderBy(c => c.Nome).Take(15)
            .Select(c => new ClienteDto { Id = c.Id, Nome = c.Nome, Telefone = c.Telefone }).ToListAsync();
    }

    public async Task<ClienteDto> ObterAsync(int id)
    {
        var c = await clientes.Query().FirstOrDefaultAsync(x => x.Id == id) ?? throw new NaoEncontradoException("Cliente");
        return new ClienteDto { Id = c.Id, Nome = c.Nome, Telefone = c.Telefone, Documento = c.Documento, Observacao = c.Observacao };
    }

    public async Task<ClienteDetalheDto> ObterDetalheAsync(int id)
    {
        var cliente = await ObterAsync(id);

        var qVendas = vendas.Query().Where(v => v.ClienteId == id);
        if (!usuario.EhDono) qVendas = qVendas.Where(v => v.UsuarioId == usuario.UsuarioId);
        var compras = await qVendas.OrderByDescending(v => v.DataVenda).Take(100)
            .Select(v => new VendaListaDto(v.Id, v.DataVenda, null, v.FormaPagamento!.Nome, v.ValorLiquido,
                usuario.EhDono ? v.Lucro : null, v.Status, v.Usuario!.Nome))
            .ToListAsync();

        var listaParcelas = await parcelas.Query().Where(p => p.ClienteId == id)
            .OrderBy(p => p.DataVencimento)
            .Select(p => new ParcelaDto(p.Id, p.VendaId, p.ClienteId, p.ClienteNome, p.ClienteTelefone, p.Numero, p.TotalParcelas,
                p.Valor, p.DataVencimento, p.DataPagamento, p.ValorPago, p.Situacao, p.DiasAtraso))
            .ToListAsync();

        return new ClienteDetalheDto(cliente,
            compras.Where(c => c.Status == StatusVenda.CONCLUIDA).Sum(c => c.Total),
            listaParcelas.Where(p => p.Situacao != "PAGA").Sum(p => p.Valor),
            compras, listaParcelas);
    }

    public async Task<ClienteDto> SalvarAsync(ClienteDto dto)
    {
        Cliente cliente;
        if (dto.Id == 0)
        {
            cliente = new Cliente { DataCadastro = Relogio.Agora };
            clientes.Adicionar(cliente);
        }
        else
        {
            cliente = await clientes.Query().FirstOrDefaultAsync(c => c.Id == dto.Id) ?? throw new NaoEncontradoException("Cliente");
        }
        cliente.Nome = dto.Nome.Trim();
        cliente.Telefone = Formatos.SoDigitos(dto.Telefone);
        cliente.Documento = Formatos.SoDigitos(dto.Documento);
        cliente.Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim();
        await uow.SalvarAsync();
        dto.Id = cliente.Id;
        dto.Telefone = cliente.Telefone;
        return dto;
    }

    public async Task DesativarAsync(int id)
    {
        var cliente = await clientes.Query().FirstOrDefaultAsync(c => c.Id == id) ?? throw new NaoEncontradoException("Cliente");
        if (await parcelas.Query().AnyAsync(p => p.ClienteId == id && p.Situacao != "PAGA"))
            throw new RegraNegocioException("Este cliente ainda tem parcelas em aberto no crediário.");
        cliente.Ativo = false;
        await uow.SalvarAsync();
    }
}
