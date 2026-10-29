/* T07 — PDV: busca de produtos, carrinho, desconto, forma de pagamento, crediário e finalização (AJAX). */
(function ($) {
  'use strict';

  const cfg = window.PDV;
  const carrinho = new Map();          // produtoId -> { produto, qtd }
  let produtosVisiveis = cfg.produtos;
  let formaId = null;
  let descontoTipo = 'reais';
  let cliente = null;                  // { id, nome, telefone }
  let enviando = false;

  const esc = (t) => $('<div>').text(t ?? '').html();
  const forma = () => cfg.formas.find(f => f.id === formaId);
  const ehCrediario = () => forma()?.tipo === 'CREDIARIO';
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // ---------- Produtos ----------
  function renderProdutos() {
    const $l = $('#lista-produtos');
    $('#sem-produtos').toggleClass('oculto', produtosVisiveis.length > 0);
    $l.html(produtosVisiveis.map(p => {
      const noCarrinho = carrinho.get(p.id)?.qtd || 0;
      const foto = p.fotoUrl
        ? `<img src="${esc(p.fotoUrl)}" alt="" class="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy">`
        : `<span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-lg font-bold text-marca-600">${esc(p.nome.charAt(0).toUpperCase())}</span>`;
      const estoque = p.estoque <= 0
        ? `<span class="text-rose-600">sem estoque</span>`
        : `<span>estoque ${p.estoque}</span>`;
      return `
        <div class="card flex items-center gap-3 p-2.5 ${noCarrinho ? 'ring-2 ring-marca-500' : ''}">
          ${foto}
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-slate-800">${esc(p.nome)}</p>
            <p class="text-sm font-bold text-marca-700">${App.moeda(p.preco)}</p>
            <p class="text-xs text-slate-500">${p.codigo ? esc(p.codigo) + ' · ' : ''}${estoque}</p>
          </div>
          ${noCarrinho ? `<span class="chip-marca">${noCarrinho}</span>` : ''}
          <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marca-600 text-white shadow-sm active:scale-95" data-add="${p.id}" aria-label="Adicionar ${esc(p.nome)}">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>`;
    }).join(''));
  }

  let timerBusca;
  $('#busca-produto').on('input', function () {
    clearTimeout(timerBusca);
    const q = this.value.trim();
    timerBusca = setTimeout(async () => {
      try {
        produtosVisiveis = q ? await App.api('/vendas/buscar-produto?q=' + encodeURIComponent(q), { metodo: 'GET' }) : cfg.produtos;
        renderProdutos();
      } catch (e) { App.toast(e.message, 'erro'); }
    }, 220);
  }).on('keydown', function (e) {
    // Enter com código exato (leitor de código de barras): adiciona direto
    if (e.key === 'Enter') {
      e.preventDefault();
      if (produtosVisiveis.length === 1) adicionar(produtosVisiveis[0].id);
    }
  });

  $(document).on('click', '[data-add]', function () { adicionar(Number($(this).data('add'))); });

  function adicionar(id) {
    const p = produtosVisiveis.find(x => x.id === id) || carrinho.get(id)?.produto;
    if (!p) return;
    const item = carrinho.get(id) || { produto: p, qtd: 0 };
    item.qtd += 1;
    carrinho.set(id, item);
    if (navigator.vibrate) navigator.vibrate(15);
    atualizar();
  }

  // ---------- Carrinho ----------
  function renderCarrinho() {
    const itens = [...carrinho.values()];
    $('#carrinho-vazio').toggleClass('oculto', itens.length > 0);
    $('#itens-carrinho').html(itens.map(({ produto: p, qtd }) => `
      <li class="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">${esc(p.nome)}</p>
          <p class="text-xs text-slate-500">${App.moeda(p.preco)} · subtotal <b class="text-slate-700">${App.moeda(p.preco * qtd)}</b></p>
          ${qtd > p.estoque ? `<p class="text-xs font-semibold text-amber-700">Estoque atual: ${p.estoque}</p>` : ''}
        </div>
        <div class="flex items-center rounded-xl bg-slate-100">
          <button type="button" class="flex h-9 w-9 items-center justify-center text-slate-600" data-menos="${p.id}" aria-label="Diminuir">−</button>
          <input type="text" inputmode="numeric" class="h-9 w-10 border-0 bg-transparent p-0 text-center text-sm font-bold focus:ring-0" value="${qtd}" data-qtd="${p.id}" aria-label="Quantidade">
          <button type="button" class="flex h-9 w-9 items-center justify-center text-slate-600" data-mais="${p.id}" aria-label="Aumentar">+</button>
        </div>
      </li>`).join(''));
  }

  $(document).on('click', '[data-mais]', function () { const it = carrinho.get(Number($(this).data('mais'))); it.qtd++; atualizar(); });
  $(document).on('click', '[data-menos]', function () {
    const id = Number($(this).data('menos'));
    const it = carrinho.get(id);
    it.qtd--;
    if (it.qtd <= 0) carrinho.delete(id);
    atualizar();
  });
  $(document).on('change', '[data-qtd]', function () {
    const id = Number($(this).data('qtd'));
    const qtd = parseInt(this.value, 10);
    if (!qtd || qtd <= 0) carrinho.delete(id); else carrinho.get(id).qtd = qtd;
    atualizar();
  });
  $('#limpar-carrinho').on('click', function () { carrinho.clear(); atualizar(); });

  // ---------- Desconto ----------
  $('#tipo-desconto').on('click', 'button', function () {
    descontoTipo = $(this).data('tipo');
    $('#tipo-desconto button').removeClass('ativo');
    $(this).addClass('ativo');
    atualizar();
  });
  $('#desconto').on('input', atualizar);

  // ---------- Forma de pagamento ----------
  $('#formas').on('click', '[data-forma]', function () {
    formaId = Number($(this).data('forma'));
    $('#formas [data-forma]').removeClass('ativo');
    $(this).addClass('ativo');
    $('#bloco-crediario').toggleClass('oculto', !ehCrediario());
    $('#rotulo-cliente').text(ehCrediario() ? 'Cliente (obrigatório no crediário)' : 'Cliente (opcional)');
    atualizar();
  });
  $('#parcelas, #vencimento').on('change', atualizar);

  // ---------- Cliente ----------
  let timerCliente;
  $('#busca-cliente').on('input', function () {
    clearTimeout(timerCliente);
    const q = this.value.trim();
    timerCliente = setTimeout(async () => {
      if (!q) { $('#sugestoes-cliente').addClass('oculto'); return; }
      try {
        const lista = await App.api('/clientes/buscar?q=' + encodeURIComponent(q), { metodo: 'GET' });
        const $s = $('#sugestoes-cliente').removeClass('oculto');
        $s.html(lista.length
          ? lista.map(c => `<li><button type="button" class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" data-cliente='${esc(JSON.stringify(c))}'><b>${esc(c.nome)}</b> <span class="text-xs text-slate-500">${esc(Mascaras.telefone(c.telefone || ''))}</span></button></li>`).join('')
          : `<li class="px-3 py-2 text-sm text-slate-500">Nenhum cliente. Use “Cadastrar cliente novo”.</li>`);
      } catch (e) { App.toast(e.message, 'erro'); }
    }, 250);
  });
  $(document).on('click', '[data-cliente]', function () { escolherCliente(JSON.parse($(this).attr('data-cliente'))); });
  $(document).on('click', function (e) { if (!$(e.target).closest('#cliente-busca').length) $('#sugestoes-cliente').addClass('oculto'); });

  function escolherCliente(c) {
    cliente = c;
    $('#cliente-nome').text(c.nome);
    $('#cliente-tel').text(Mascaras.telefone(c.telefone || ''));
    $('#cliente-escolhido').removeClass('oculto');
    $('#cliente-busca, #abrir-cliente-rapido, #cliente-rapido').addClass('oculto');
    $('#sugestoes-cliente').addClass('oculto');
    atualizar();
  }
  $('#trocar-cliente').on('click', function () {
    cliente = null;
    $('#cliente-escolhido').addClass('oculto');
    $('#cliente-busca, #abrir-cliente-rapido').removeClass('oculto');
    $('#busca-cliente').val('').trigger('focus');
    atualizar();
  });
  $('#abrir-cliente-rapido').on('click', function () {
    $('#cliente-rapido').removeClass('oculto');
    $('#rapido-nome').val($('#busca-cliente').val()).trigger('focus');
  });
  $('#cancelar-cliente-rapido').on('click', () => $('#cliente-rapido').addClass('oculto'));
  $('#salvar-cliente-rapido').on('click', async function () {
    const nome = $('#rapido-nome').val().trim();
    if (!nome) { App.toast('Informe o nome do cliente.', 'erro'); return; }
    const $b = $(this).prop('disabled', true);
    try {
      const r = await App.api('/clientes/rapido', { corpo: { nome, telefone: $('#rapido-telefone').val() } });
      escolherCliente(r.dados);
      $('#rapido-nome, #rapido-telefone').val('');
      App.toast('Cliente cadastrado.');
    } catch (e) { App.toast(e.message, 'erro'); } finally { $b.prop('disabled', false); }
  });

  // ---------- Cálculo (mesmas regras do servidor) ----------
  function calcular() {
    let bruto = 0, custo = 0, qtd = 0;
    carrinho.forEach(({ produto: p, qtd: q }) => { bruto += p.preco * q; custo += (p.custo || 0) * q; qtd += q; });
    bruto = r2(bruto); custo = r2(custo);
    const valorDesc = App.lerNumero($('#desconto').val());
    let desconto = descontoTipo === 'percentual' ? r2(bruto * Math.min(valorDesc, 100) / 100) : r2(valorDesc);
    const descontoInvalido = desconto > bruto;
    if (descontoInvalido) desconto = bruto;
    const total = r2(bruto - desconto);
    const f = forma();
    const taxa = f && total > 0 ? r2(total * f.taxaPercentual / 100 + f.taxaFixa) : 0;
    const lucro = r2(total - taxa - custo);
    return { bruto, custo, qtd, desconto, total, taxa, lucro, descontoInvalido };
  }

  function atualizar() {
    const c = calcular();
    renderCarrinho();
    renderProdutos();
    $('#carrinho-qtd').text(c.qtd);
    $('#resumo-subtotal').text(App.moeda(c.bruto));
    $('#resumo-desconto').text('− ' + App.moeda(c.desconto));
    $('#linha-desconto').toggleClass('text-rose-600', c.descontoInvalido);
    $('#resumo-taxa').text(App.moeda(c.taxa));
    $('#resumo-total').text(App.moeda(c.total));
    $('#resumo-lucro').text(App.moeda(c.lucro)).closest('div')
      .toggleClass('bg-emerald-50 text-emerald-700', c.lucro >= 0).toggleClass('bg-rose-50 text-rose-700', c.lucro < 0);
    $('#barra-qtd').text(c.qtd ? `${c.qtd} ${c.qtd === 1 ? 'item' : 'itens'} · Ver carrinho` : 'Carrinho vazio');
    $('#barra-total').text(App.moeda(c.total));
    $('#abrir-carrinho').prop('disabled', c.qtd === 0);

    if (ehCrediario()) {
      const n = Number($('#parcelas').val());
      const parcela = Math.floor(c.total / n * 100) / 100;
      const ultima = r2(c.total - parcela * (n - 1));
      $('#info-parcelas').text(c.total > 0
        ? (n === 1 ? `1x de ${App.moeda(c.total)}` : `${n - 1}x de ${App.moeda(parcela)}${ultima !== parcela ? ` + 1x de ${App.moeda(ultima)}` : ` + 1x de ${App.moeda(parcela)}`} · a cada 30 dias`)
        : '');
    }

    const podeFinalizar = c.qtd > 0 && formaId && !c.descontoInvalido && (!ehCrediario() || cliente);
    $('#finalizar').prop('disabled', !podeFinalizar || enviando)
      .text(c.descontoInvalido ? 'Desconto maior que o valor' : ehCrediario() && !cliente ? 'Escolha o cliente' : !formaId && c.qtd ? 'Escolha a forma de pagamento' : 'Finalizar venda');
  }

  // ---------- Painel do carrinho no celular ----------
  $('#abrir-carrinho').on('click', () => { $('#painel-carrinho').removeClass('max-lg:hidden'); $('body').addClass('overflow-hidden'); });
  $('#fechar-carrinho').on('click', fecharPainel);
  function fecharPainel() { $('#painel-carrinho').addClass('max-lg:hidden'); $('body').removeClass('overflow-hidden'); }

  // ---------- Finalizar ----------
  $('#finalizar').on('click', async function () {
    if (enviando) return;
    enviando = true;
    const $b = $(this).prop('disabled', true).text('Registrando…');
    try {
      const corpo = {
        itens: [...carrinho.values()].map(i => ({ produtoId: i.produto.id, quantidade: i.qtd })),
        desconto: App.lerNumero($('#desconto').val()),
        descontoEmPercentual: descontoTipo === 'percentual',
        formaPagamentoId: formaId,
        clienteId: cliente?.id || null,
        qtdParcelas: ehCrediario() ? Number($('#parcelas').val()) : 1,
        primeiroVencimento: ehCrediario() ? $('#vencimento').val() : null
      };
      const r = await App.api('/vendas', { corpo });
      mostrarSucesso(r.dados);
    } catch (e) {
      App.toast(e.message, 'erro');
    } finally {
      enviando = false;
      atualizar();
    }
  });

  function mostrarSucesso(v) {
    $('#sucesso-total').text(App.moeda(v.total));
    $('#sucesso-lucro').text(v.lucro != null ? `Lucro: ${App.moeda(v.lucro)}` : '');
    $('#sucesso-avisos').html(v.avisos.map(a => `<li class="rounded-lg bg-amber-50 px-3 py-1.5">⚠️ ${esc(a)}</li>`).join(''));
    $('#sucesso-recibo').attr('href', v.linkRecibo);
    $('#sucesso-ver').attr('href', '/vendas/' + v.vendaId);
    fecharPainel();
    App.abrir('sucesso');
    // Atualiza o estoque mostrado nos cards
    carrinho.forEach(({ produto, qtd }) => {
      [cfg.produtos, produtosVisiveis].forEach(lista => { const p = lista.find(x => x.id === produto.id); if (p && p !== produto) p.estoque -= qtd; });
      produto.estoque -= qtd;
    });
  }

  $('#sucesso-nova').on('click', function () {
    carrinho.clear();
    $('#desconto').val('');
    if (cliente) $('#trocar-cliente').trigger('click');
    App.fechar('sucesso');
    $('#busca-produto').val('');
    produtosVisiveis = cfg.produtos;
    atualizar();
    window.scrollTo(0, 0);
  });

  $(function () {
    // Seleciona Pix (ou a primeira forma) para agilizar
    const padrao = cfg.formas.find(f => f.tipo === 'PIX') || cfg.formas[0];
    if (padrao) $(`#formas [data-forma="${padrao.id}"]`).trigger('click');
    atualizar();
  });
})(jQuery);
