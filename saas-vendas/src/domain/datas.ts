/**
 * Datas no fuso de Brasília, sempre como texto "yyyy-MM-dd HH:mm:ss" (data e hora "de parede").
 * É assim que ficam gravadas no banco (datetime2 / date), igual na versão .NET.
 */

const FUSO = 'America/Sao_Paulo';
const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

/** Agora em Brasília: "2026-10-29 14:05:00". */
export function agora(): string {
  const p = Object.fromEntries(formatador.formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** Hoje em Brasília: "2026-10-29". */
export function hoje(): string {
  return agora().slice(0, 10);
}

/** Texto → Date "falso UTC" (os campos UTC são a hora de Brasília). Só para contas. */
export function paraDate(texto: string): Date {
  const t = texto.length === 10 ? `${texto}T00:00:00Z` : `${texto.replace(' ', 'T').slice(0, 19)}Z`;
  return new Date(t);
}

/** Date "falso UTC" → texto. */
export function deDate(d: Date, soData = false): string {
  const iso = d.toISOString();
  return soData ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

/** Normaliza o que vem do banco (Date do SQL Server ou texto do SQLite). */
export function lerData(valor: unknown): string {
  if (valor == null) return '';
  if (valor instanceof Date) return deDate(valor);
  const s = String(valor);
  return s.length === 10 ? `${s} 00:00:00` : s.replace('T', ' ').slice(0, 19);
}

export function somarDias(data: string, dias: number): string {
  const d = paraDate(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return deDate(d, data.length === 10);
}

export function somarMeses(data: string, meses: number): string {
  const d = paraDate(data);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return deDate(d, data.length === 10);
}

export function diferencaDias(de: string, ate: string): number {
  return Math.round((paraDate(ate.slice(0, 10)).getTime() - paraDate(de.slice(0, 10)).getTime()) / 86_400_000);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function nomeMes(mes: number): string {
  return MESES[mes - 1];
}

/** dd/MM/yyyy */
export function formatarData(texto: string): string {
  if (!texto) return '';
  const [a, m, d] = texto.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** dd/MM/yyyy HH:mm */
export function formatarDataHora(texto: string): string {
  if (!texto) return '';
  return `${formatarData(texto)} ${texto.slice(11, 16)}`;
}
