/* jQuery Validate com números no formato brasileiro (1.234,56). */
(function ($) {
  'use strict';
  if (!$.validator) return;

  const ler = (v) => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));

  $.validator.methods.number = function (value, element) {
    return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(value) || /^-?\d+(?:\.\d+)?$/.test(value);
  };
  $.validator.methods.range = function (value, element, param) {
    const n = ler(value);
    return this.optional(element) || (n >= param[0] && n <= param[1]);
  };
  $.validator.methods.min = function (value, element, param) {
    return this.optional(element) || ler(value) >= param;
  };
  $.validator.methods.max = function (value, element, param) {
    return this.optional(element) || ler(value) <= param;
  };

  $.validator.setDefaults({
    errorClass: 'input-validation-error',
    ignore: ':hidden:not(.validar-oculto)'
  });

  // Mensagens padrão do ASP.NET (em inglês) trocadas por português antes do unobtrusive ler os atributos.
  $('[data-val-required]').each(function () {
    if (/^The .* field is required\.$/.test(this.getAttribute('data-val-required'))) this.setAttribute('data-val-required', 'Campo obrigatório.');
  });
  $('[data-val-number]').each(function () { this.setAttribute('data-val-number', 'Informe um número válido.'); });

  $.extend($.validator.messages, {
    required: 'Campo obrigatório.',
    email: 'E-mail inválido.',
    number: 'Informe um número válido.',
    equalTo: 'Os valores não conferem.'
  });
})(jQuery);
