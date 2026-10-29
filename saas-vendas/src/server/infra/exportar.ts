import 'server-only';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { formatarData, formatarDataHora, agora } from '@/domain/datas';
import { formatarMoeda, formatarNumero, formatarTelefone } from '@/domain/formatos';
import type { Coluna, Relatorio, Valor } from '../services/relatorios';
import type { VendaDetalhe } from '../services/vendas';

const ROXO = '#7C3AED';

export function formatarValor(c: Coluna, v: Valor): string {
  if (v == null) return '';
  if (typeof v === 'number') {
    if (c.tipo === 'moeda') return formatarMoeda(v);
    if (c.tipo === 'percentual') return `${formatarNumero(v, 1)}%`;
    return formatarNumero(v, 0);
  }
  return String(v);
}

function gerar(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    doc.on('data', b => partes.push(b));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.end();
  });
}

/** Relatório em PDF (tabela com cabeçalho roxo, zebrado e linha de totais). */
export function relatorioPdf(r: Relatorio, empresa: string): Promise<Buffer> {
  const paisagem = r.colunas.length > 5;
  const doc = new PDFDocument({ size: 'A4', layout: paisagem ? 'landscape' : 'portrait', margin: 36, bufferPages: true, info: { Title: r.titulo } });
  const largura = doc.page.width - 72;
  const pesos = r.colunas.map(c => (c.tipo === 'texto' ? 2 : 1));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const larguras = pesos.map(p => (p / somaPesos) * largura);

  doc.fontSize(9).fillColor('#64748b').text(empresa);
  doc.fontSize(16).fillColor(ROXO).font('Helvetica-Bold').text(r.titulo);
  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(r.subtitulo).moveDown(0.8);

  const linha = (valores: string[], opcoes: { fundo?: string; cor?: string; negrito?: boolean }) => {
    if (doc.y > doc.page.height - 60) doc.addPage();
    const y = doc.y;
    if (opcoes.fundo) doc.rect(36, y - 2, largura, 16).fill(opcoes.fundo);
    let x = 36;
    doc.font(opcoes.negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(opcoes.cor ?? '#0f172a');
    valores.forEach((v, i) => {
      doc.text(v, x + 4, y + 2, { width: larguras[i] - 8, align: r.colunas[i].tipo === 'texto' ? 'left' : 'right', lineBreak: false, ellipsis: true });
      x += larguras[i];
    });
    doc.y = y + 16;
  };

  linha(r.colunas.map(c => c.titulo), { fundo: ROXO, cor: '#ffffff', negrito: true });
  r.linhas.forEach((l, i) => linha(r.colunas.map((c, j) => formatarValor(c, l[j])), { fundo: i % 2 ? '#f8fafc' : undefined }));
  if (r.totais) linha(r.colunas.map((c, j) => formatarValor(c, r.totais![j])), { fundo: '#ede9fe', negrito: true });
  if (!r.linhas.length) doc.moveDown().fontSize(10).fillColor('#64748b').text('Nada para mostrar nesse período.');

  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    // Rodapé dentro da margem inferior: sem zerar a margem o PDFKit abriria uma página nova.
    const margemInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(7.5).fillColor('#94a3b8').text(`Gerado em ${formatarDataHora(agora())} · página ${i + 1} de ${paginas.count}`,
      36, doc.page.height - 30, { width: largura, align: 'right', lineBreak: false });
    doc.page.margins.bottom = margemInferior;
  }
  return gerar(doc);
}

export async function relatorioExcel(r: Relatorio): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(r.titulo.slice(0, 31));
  ws.addRow([r.titulo]).font = { bold: true, size: 14 };
  ws.addRow([r.subtitulo]);
  ws.addRow([]);
  const cab = ws.addRow(r.colunas.map(c => c.titulo));
  cab.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  });
  const escrever = (valores: Valor[], negrito = false) => {
    const row = ws.addRow(valores.map((v, i) => (typeof v === 'number' && r.colunas[i].tipo === 'percentual' ? v / 100 : v ?? null)));
    r.colunas.forEach((c, i) => {
      const cel = row.getCell(i + 1);
      if (c.tipo === 'moeda') cel.numFmt = '"R$" #,##0.00';
      else if (c.tipo === 'percentual') cel.numFmt = '0.0%';
      else if (c.tipo === 'numero') cel.numFmt = '#,##0';
    });
    if (negrito) row.font = { bold: true };
  };
  r.linhas.forEach(l => escrever(l));
  if (r.totais) escrever(r.totais, true);
  ws.columns.forEach((col, i) => { col.width = Math.max(12, ...r.linhas.map(l => String(l[i] ?? '').length + 2), r.colunas[i]?.titulo.length + 2 || 12); });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Recibo em formato de bobina de 80 mm. */
export function reciboPdf(v: VendaDetalhe, empresa: string, telefone: string | null): Promise<Buffer> {
  const doc = new PDFDocument({ size: [226, 600], margin: 14, info: { Title: `Recibo ${v.id}` } });
  const w = 198;
  const centro = (t: string, tam = 8, negrito = false) => doc.font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(tam).fillColor('#0f172a').text(t, { width: w, align: 'center' });
  const par = (a: string, b: string, negrito = false) => {
    const y = doc.y;
    doc.font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(a, 14, y, { width: 130 });
    const yFim = doc.y;
    doc.text(b, 144, y, { width: 68, align: 'right' });
    doc.y = Math.max(yFim, doc.y);
  };
  const traco = () => { doc.moveDown(0.3); doc.moveTo(14, doc.y).lineTo(212, doc.y).lineWidth(0.5).stroke('#cbd5e1'); doc.moveDown(0.4); };

  centro(empresa, 11, true);
  if (telefone) centro(formatarTelefone(telefone));
  centro(`Recibo da venda nº ${v.id}`, 8, true);
  centro(formatarDataHora(v.dataVenda));
  if (v.cliente) { doc.moveDown(0.3); doc.font('Helvetica').fontSize(8).text(`Cliente: ${v.cliente}`, 14); }
  traco();
  for (const i of v.itens) par(`${i.quantidade}x ${i.produto}`, formatarMoeda(i.quantidade * i.precoUnitario));
  traco();
  if (v.desconto > 0) { par('Subtotal', formatarMoeda(v.valorBruto)); par('Desconto', `- ${formatarMoeda(v.desconto)}`); }
  par('Total', formatarMoeda(v.valorLiquido), true);
  doc.font('Helvetica').fontSize(8).text(`Pagamento: ${v.formaPagamento}`, 14);
  if (v.parcelas.length) {
    doc.moveDown(0.4).font('Helvetica-Bold').text(`Crediário em ${v.parcelas.length}x`, 14);
    for (const p of v.parcelas) doc.font('Helvetica').text(`${p.numero}ª  ${formatarMoeda(p.valor)}  vence ${formatarData(p.dataVencimento)}`, 14);
  }
  if (v.status === 'CANCELADA') { doc.moveDown(0.6); doc.fillColor('#e11d48'); centro('VENDA CANCELADA', 9, true); }
  doc.moveDown(0.8);
  centro('Obrigado pela preferência!');
  return gerar(doc);
}
