using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControleVendas.Web.Controllers;

/// <summary>T17 — Assinatura.</summary>
public class AssinaturaController(AssinaturaService assinatura) : AppController
{
    [HttpGet("/assinatura")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> Index()
    {
        ViewBag.Status = await assinatura.StatusAsync();
        ViewBag.Historico = await assinatura.HistoricoAsync();
        return View(Planos.Todos);
    }

    [HttpPost("/assinatura")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> Checkout(CheckoutDto dto)
    {
        var cobranca = await assinatura.CheckoutAsync(dto);
        // Cartão: vai direto para o link de pagamento do gateway.
        if (dto.Forma == FormaPagamentoAssinatura.CARTAO && cobranca.LinkPagamento is not null)
            return Redirect(cobranca.LinkPagamento);
        ViewBag.Plano = Planos.Obter(dto.Opcao);
        ViewBag.Status = await assinatura.StatusAsync();
        return View("Pagamento", cobranca);
    }

    /// <summary>Tela de bloqueio quando o teste ou a assinatura vencer.</summary>
    [HttpGet("/assinatura/bloqueio")]
    public async Task<IActionResult> Bloqueio()
    {
        if (Empresa.AssinaturaAtiva) return Redirect("/painel");
        return View(await assinatura.StatusAsync());
    }

    /// <summary>Só em desenvolvimento (gateway simulado): confirma o pagamento na hora.</summary>
    [HttpPost("/assinatura/simular")]
    [Authorize(Roles = "DONO")]
    public async Task<IActionResult> Simular(OpcaoPlano opcao)
    {
        await assinatura.SimularPagamentoAsync(opcao);
        Sucesso($"Pagamento simulado: plano {Planos.Obter(opcao).Nome} ativo.");
        return Redirect("/assinatura");
    }
}
