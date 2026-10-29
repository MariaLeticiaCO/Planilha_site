/* Máscaras de digitação: telefone, dinheiro, CPF/CNPJ.
   Uso: data-mascara="telefone" | "dinheiro" | "documento" | "inteiro" */
(function ($) {
  'use strict';

  const so = (v) => (v || '').replace(/\D/g, '');

  const mascaras = {
    telefone(v) {
      const d = so(v).slice(0, 11);
      if (d.length <= 2) return d.length ? `(${d}` : '';
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    },
    documento(v) {
      const d = so(v).slice(0, 14);
      if (d.length <= 11) {
        return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }
      return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    },
    /** Digita da direita para a esquerda: 1 → 0,01 → 0,12 → 1,23 */
    dinheiro(v) {
      const d = so(v).replace(/^0+/, '');
      if (!d) return '';
      const n = parseInt(d, 10) / 100;
      return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    inteiro(v) { return so(v); }
  };

  function aplicar(el) {
    const tipo = el.dataset.mascara;
    if (!mascaras[tipo]) return;
    el.value = mascaras[tipo](el.value);
  }

  // Fase de captura: a máscara roda antes dos outros "input" (cálculos de margem, carrinho...).
  document.addEventListener('input', function (e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.mascara) return;
    aplicar(el);
    if (el.dataset.mascara === 'dinheiro' || el.dataset.mascara === 'inteiro') {
      const fim = el.value.length;
      try { el.setSelectionRange(fim, fim); } catch { /* type=number */ }
    }
  }, true);

  // Dinheiro: cada dígito entra sempre no fim e o Backspace apaga o último,
  // não importa onde está o cursor (como numa maquininha).
  document.addEventListener('beforeinput', function (e) {
    const el = e.target;
    if (el.dataset?.mascara !== 'dinheiro') return;
    let digitos = so(el.value).replace(/^0+/, '');
    if (e.inputType === 'insertText' && /^\d+$/.test(e.data || '')) digitos += e.data;
    else if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') digitos = digitos.slice(0, -1);
    else return; // colar, autocompletar etc.: o "input" formata
    e.preventDefault();
    el.value = mascaras.dinheiro(digitos);
    cursorNoFim(el);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);

  // O cursor fica sempre no fim.
  function cursorNoFim(el) {
    const fim = el.value.length;
    try { el.setSelectionRange(fim, fim); } catch { /* type=number */ }
  }
  document.addEventListener('focus', function (e) {
    const el = e.target;
    if (el.dataset?.mascara !== 'dinheiro') return;
    cursorNoFim(el);
    setTimeout(() => cursorNoFim(el), 0);
  }, true);
  document.addEventListener('click', function (e) {
    if (e.target.dataset?.mascara === 'dinheiro') cursorNoFim(e.target);
  }, true);

  $(function () {
    $('[data-mascara]').each(function () {
      // Valor vindo do servidor ("12,5") vira "12,50"
      if (this.dataset.mascara === 'dinheiro' && this.value) {
        const n = window.App ? App.lerNumero(this.value) : parseFloat(this.value.replace(',', '.'));
        this.value = isNaN(n) ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        aplicar(this);
      }
    });
  });

  window.Mascaras = mascaras;
})(jQuery);
