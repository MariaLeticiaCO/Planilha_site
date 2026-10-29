/* Utilidades comuns a todas as telas */
(function ($) {
  'use strict';

  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  window.App = {
    moeda: (v) => moeda.format(Number(v) || 0),
    numero: (v, casas = 2) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }),

    /** Lê "1.234,56" (ou "1234.56") como número. */
    lerNumero(texto) {
      if (typeof texto === 'number') return texto;
      if (!texto) return 0;
      let t = String(texto).replace(/[^\d,.-]/g, '');
      if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(t);
      return isNaN(n) ? 0 : n;
    },

    /** POST/GET com JSON + token antiforgery. Devolve o JSON; erros viram exceção com a mensagem do servidor. */
    async api(url, { metodo = 'POST', corpo } = {}) {
      const resp = await fetch(url, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'RequestVerificationToken': $('meta[name="csrf-token"]').attr('content')
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        credentials: 'same-origin'
      });
      let dados = null;
      try { dados = await resp.json(); } catch { /* sem corpo */ }
      if (!resp.ok) {
        if (dados && dados.redirect && (resp.status === 401 || resp.status === 402)) {
          window.location.href = dados.redirect;
        }
        throw new Error((dados && dados.erro) || 'Não foi possível concluir. Verifique sua internet e tente de novo.');
      }
      return dados;
    },

    toast(mensagem, tipo = 'sucesso') {
      const cor = tipo === 'erro' ? 'bg-rose-600' : 'bg-slate-900';
      const $t = $(`<div class="toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl ${cor} px-4 py-3 text-sm text-white shadow-lg" role="status"><span class="flex-1"></span></div>`);
      $t.find('span').text(mensagem);
      $('#toasts').append($t);
      esconderDepois($t);
    },

    abrir(id) { $('#' + id).removeClass('oculto'); $('body').addClass('overflow-hidden'); },
    fechar(id) { $('#' + id).addClass('oculto'); $('body').removeClass('overflow-hidden'); }
  };

  function esconderDepois($el) {
    setTimeout(() => $el.fadeOut(300, () => $el.remove()), 4500);
  }

  $(function () {
    $('#toasts .toast').each(function () { esconderDepois($(this)); });

    // Abrir/fechar gavetas e modais: data-abrir="id" / data-fechar="id"
    $(document).on('click', '[data-abrir]', function (e) { e.preventDefault(); App.abrir($(this).data('abrir')); });
    $(document).on('click', '[data-fechar]', function (e) { e.preventDefault(); App.fechar($(this).data('fechar')); });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') $('[role="dialog"]:not(.oculto)').each(function () { App.fechar(this.id); });
    });

    // Confirmação antes de enviar: <form data-confirmar="Tem certeza?">
    $(document).on('submit', 'form[data-confirmar]', function (e) {
      if (!window.confirm($(this).data('confirmar'))) e.preventDefault();
    });

    // Evita duplo envio
    $(document).on('submit', 'form:not([data-sem-trava])', function () {
      const $f = $(this);
      if ($f.data('enviando')) return false;
      if (typeof $f.valid === 'function' && !$f.valid()) return;
      $f.data('enviando', true);
      $f.find('button[type="submit"], button:not([type])').prop('disabled', true);
      setTimeout(() => { $f.data('enviando', false); $f.find('button').prop('disabled', false); }, 8000);
    });

    // Filtros que se enviam sozinhos
    $(document).on('change', '[data-autoenviar]', function () { this.form.submit(); });
  });

  // PWA: registra o service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
  }
})(jQuery);
