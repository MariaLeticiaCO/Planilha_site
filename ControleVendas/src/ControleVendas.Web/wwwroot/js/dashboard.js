/* T06 — Dashboard: busca /painel/dados e desenha cards, gráficos (ApexCharts) e rankings. */
(function ($) {
  'use strict';

  const CORES = ['#7c3aed', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#64748b', '#a855f7', '#14b8a6'];
  let graficoLinha = null;
  let graficoPizza = null;
  let periodoAtual = 'hoje';

  const esc = (t) => $('<div>').text(t ?? '').html();
  const curto = (v) => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return App.moeda(n);
  };

  async function carregar(periodo, inicio, fim) {
    periodoAtual = periodo;
    const params = new URLSearchParams({ periodo });
    if (inicio) params.set('inicio', inicio);
    if (fim) params.set('fim', fim);
    $('[data-card]').css('opacity', .5);
    try {
      const dados = await App.api('/painel/dados?' + params, { metodo: 'GET' });
      render(dados);
    } catch (e) {
      App.toast(e.message, 'erro');
    } finally {
      $('[data-card]').css('opacity', 1);
    }
  }

  function render(d) {
    const r = d.resumo;
    $('#periodo-texto').text(d.periodoTexto);
    $('[data-card="faturamento"]').text(App.moeda(r.faturamento));
    $('[data-card="qtdVendas"]').text(`${r.qtdVendas} ${r.qtdVendas === 1 ? 'venda' : 'vendas'}`);
    $('[data-card="lucro"]').text(App.moeda(r.lucro));
    const margem = r.faturamento > 0 ? (r.lucro / r.faturamento * 100) : 0;
    $('[data-card="margem"]').text(r.faturamento > 0 ? `${App.numero(margem, 1)}% do faturamento · custo ${App.moeda(r.custo)}` : 'Nenhuma venda no período');
    $('[data-card="ticketMedio"]').text(App.moeda(r.ticketMedio));
    $('[data-card="taxas"]').text(`Taxas: ${App.moeda(r.taxas)}`);
    $('[data-card="aReceber"]').text(App.moeda(r.aReceber));
    $('[data-card="atrasado"]').text(r.atrasado > 0 ? `${App.moeda(r.atrasado)} atrasado` : 'Nada atrasado 🎉')
      .toggleClass('text-rose-600', r.atrasado > 0).toggleClass('text-emerald-600', !(r.atrasado > 0));

    renderLinha(d.serie);
    renderPizza(d.formas);
    $('#total-taxas').text(App.moeda(d.totalTaxas));
    renderRanking('#mais-vendidos', d.maisVendidos, false);
    renderRanking('#menos-vendidos', d.menosVendidos, true);

    const $alerta = $('#alerta-estoque');
    if (d.estoqueBaixo.length) {
      $('#lista-estoque').html(d.estoqueBaixo.map(p =>
        `<li class="chip ${p.estoque <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}">${esc(p.nome)}: ${p.estoque}</li>`).join(''));
      $alerta.removeClass('oculto');
    } else {
      $alerta.addClass('oculto');
    }
  }

  function renderLinha(serie) {
    const opcoes = {
      chart: { type: 'area', height: 280, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif', animations: { speed: 400 } },
      series: [
        { name: 'Faturamento', data: serie.map(p => p.faturamento) },
        { name: 'Lucro', data: serie.map(p => p.lucro) }
      ],
      xaxis: {
        categories: serie.map(p => p.rotulo),
        tickAmount: Math.min(serie.length, window.innerWidth < 640 ? 6 : 12),
        labels: { rotate: 0, style: { colors: '#64748b', fontSize: '11px' }, hideOverlappingLabels: true },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { formatter: curto, style: { colors: '#64748b', fontSize: '11px' } } },
      colors: ['#7c3aed', '#10b981'],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.28, opacityTo: 0.02 } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#eef2f7', strokeDashArray: 4 },
      legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
      tooltip: { y: { formatter: (v) => App.moeda(v) } },
      noData: { text: 'Sem vendas no período' }
    };
    if (graficoLinha) { graficoLinha.updateOptions(opcoes, true, true); return; }
    graficoLinha = new ApexCharts(document.querySelector('#grafico-linha'), opcoes);
    graficoLinha.render();
  }

  function renderPizza(formas) {
    const vazio = formas.length === 0;
    const opcoes = {
      chart: { type: 'donut', height: 260, fontFamily: 'Inter, sans-serif' },
      series: vazio ? [] : formas.map(f => Number(f.total)),
      labels: formas.map(f => f.nome),
      colors: CORES,
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: false },
      stroke: { width: 2 },
      plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Total', formatter: (w) => curto(w.globals.seriesTotals.reduce((a, b) => a + b, 0)) }, value: { formatter: (v) => curto(v) } } } } },
      tooltip: { y: { formatter: (v, { seriesIndex }) => `${App.moeda(v)} · taxas ${App.moeda(formas[seriesIndex]?.taxas)}` } },
      noData: { text: 'Sem vendas no período' }
    };
    if (graficoPizza) { graficoPizza.destroy(); }
    graficoPizza = new ApexCharts(document.querySelector('#grafico-pizza'), opcoes);
    graficoPizza.render();
  }

  function renderRanking(seletor, lista, mostrarEstoque) {
    const $l = $(seletor);
    if (!lista.length) {
      $l.html(`<li class="py-4 text-center text-sm text-slate-500">${mostrarEstoque ? 'Cadastre produtos para ver o que está parado.' : 'Nenhuma venda no período.'}</li>`);
      return;
    }
    const max = Math.max(...lista.map(p => p.qtd), 1);
    $l.html(lista.map((p, i) => `
      <li class="flex items-center gap-3">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${mostrarEstoque ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'} text-xs font-bold">${i + 1}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <span class="truncate text-sm font-semibold text-slate-800">${esc(p.nome)}</span>
            <span class="shrink-0 text-sm font-bold text-slate-900">${p.qtd} un.</span>
          </div>
          <div class="mt-1 flex items-center gap-2">
            <div class="h-1.5 flex-1 rounded-full bg-slate-100"><div class="h-1.5 rounded-full ${mostrarEstoque ? 'bg-amber-400' : 'bg-emerald-500'}" style="width:${Math.max(p.qtd / max * 100, 2)}%"></div></div>
            ${mostrarEstoque ? `<span class="shrink-0 text-xs ${p.estoque > 0 ? 'text-slate-500' : 'text-rose-600'}">estoque ${p.estoque}</span>` : `<span class="shrink-0 text-xs text-slate-500">${App.moeda(p.total)}</span>`}
          </div>
        </div>
      </li>`).join(''));
  }

  $(function () {
    $('#filtro-periodo').on('click', 'button', function () {
      const periodo = $(this).data('periodo');
      $('#filtro-periodo button').removeClass('ativo');
      $(this).addClass('ativo');
      if (periodo === 'personalizado') {
        $('#filtro-personalizado').removeClass('oculto');
        return;
      }
      $('#filtro-personalizado').addClass('oculto');
      carregar(periodo);
    });
    $('#filtro-personalizado').on('submit', function (e) {
      e.preventDefault();
      carregar('personalizado', $('#filtro-inicio').val(), $('#filtro-fim').val());
    });
    carregar('hoje');
  });
})(jQuery);
