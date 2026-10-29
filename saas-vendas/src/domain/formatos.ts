const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—';
  return moeda.format(valor).replace(/ /g, ' ');
}

export function formatarNumero(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarPercentual(valor: number): string {
  return `${formatarNumero(valor, 1)}%`;
}

/** Lê "1.234,56" ou "1234.56" como número. */
export function lerNumero(texto: unknown): number {
  if (typeof texto === 'number') return texto;
  if (texto == null || texto === '') return 0;
  let t = String(texto).replace(/[^\d,.-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isNaN(n) ? 0 : n;
}

export function soDigitos(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const d = texto.replace(/\D/g, '');
  return d.length ? d : null;
}

/** Telefone no formato que o wa.me espera: 55 + DDD + número. */
export function telefoneWhatsApp(telefone: string | null | undefined): string | null {
  const d = soDigitos(telefone);
  if (!d) return null;
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
}

/** https://wa.me/55{telefone}?text={mensagem} */
export function linkWhatsApp(telefone: string | null | undefined, mensagem: string): string {
  const numero = telefoneWhatsApp(telefone);
  const texto = encodeURIComponent(mensagem);
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}

export function formatarTelefone(telefone: string | null | undefined): string {
  let d = soDigitos(telefone);
  if (!d) return '';
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p.length === 1 ? p[0][0] : p[0][0] + p[p.length - 1][0]).toUpperCase();
}
