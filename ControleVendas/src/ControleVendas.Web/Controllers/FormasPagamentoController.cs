using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T12 — Formas de pagamento e taxas.</summary>
[Authorize(Roles = "DONO")]
public class FormasPagamentoController(FormaPagamentoService formas) : AppController
{
    [HttpGet("/formas-pagamento")]
    public async Task<IActionResult> Index() => View(await formas.ListarAsync());

    [HttpPost("/formas-pagamento")]
    public async Task<IActionResult> Salvar(FormaPagamentoDto dto)
    {
        if (!ModelState.IsValid)
        {
            Erro(PrimeiroErro());
            return Redirect("/formas-pagamento");
        }
        await formas.SalvarAsync(dto);
        Sucesso(dto.Id == 0 ? "Forma de pagamento criada." : "Taxas atualizadas.");
        return Redirect("/formas-pagamento");
    }

    [HttpPost("/formas-pagamento/{id:int}/ativo")]
    public async Task<IActionResult> AlterarAtivo(int id, bool ativo)
    {
        await formas.AlterarAtivoAsync(id, ativo);
        Sucesso(ativo ? "Forma de pagamento ativada." : "Forma de pagamento desativada.");
        return Redirect("/formas-pagamento");
    }

    [HttpPost("/formas-pagamento/faixas-credito")]
    public async Task<IActionResult> FaixasCredito()
    {
        await formas.CriarFaixasCreditoAsync();
        Sucesso("Faixas de crédito parcelado criadas. Agora informe a taxa de cada uma.");
        return Redirect("/formas-pagamento");
    }
}
