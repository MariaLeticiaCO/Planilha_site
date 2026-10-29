/* T14 — Crediário: dar baixa na parcela via AJAX. */
(function ($) {
  'use strict';

  $(document).on('click', '[data-baixa]', async function () {
    const $b = $(this);
    const id = $b.data('baixa');
    if (!window.confirm(`Confirmar o pagamento de ${$b.data('valor')} de ${$b.data('cliente')}?`)) return;
    $b.prop('disabled', true).text('Salvando…');
    try {
      const r = await App.api(`/crediario/${id}/baixa`);
      const $card = $(`[data-parcela="${id}"]`);
      $card.find('[data-situacao]').attr('class', 'chip-verde').text('Paga');
      $card.find('[data-acoes]').replaceWith(`<span class="text-sm font-semibold text-emerald-600">Baixa feita: ${App.moeda(r.dados.valorPago)}</span>`);
      $card.addClass('opacity-70');
      App.toast('Pagamento registrado.');
    } catch (e) {
      App.toast(e.message, 'erro');
      $b.prop('disabled', false).text('Dar baixa');
    }
  });
})(jQuery);
