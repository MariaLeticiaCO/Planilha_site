import { z } from 'zod';
import { lerNumero } from './formatos';
import { MAX_PARCELAS } from './parcelas';
import { TIPOS_PAGAMENTO } from './tipos';

/** Número digitado no formato brasileiro ("1.234,56"). */
const dinheiro = z.preprocess(v => lerNumero(v), z.number());
const inteiro = z.preprocess(v => (v === '' || v == null ? 0 : Math.trunc(lerNumero(v))), z.number().int());
const textoOpcional = (max: number) =>
  z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().trim().max(max).nullable().optional());
const telefone = z.preprocess(
  v => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().nullable().optional().refine(t => !t || (t.replace(/\D/g, '').length >= 10 && t.replace(/\D/g, '').length <= 13), 'Informe o telefone com DDD.')
);
const marcado = z.preprocess(v => v === true || v === 'on' || v === 'true' || v === '1', z.boolean());

export const senhaForte = z.string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra.')
  .regex(/[0-9]/, 'A senha precisa ter pelo menos um número.');

const email = z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.').max(160);

export const cadastroSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').max(120),
  email,
  whatsapp: z.string().refine(t => t.replace(/\D/g, '').length >= 10, 'Informe o WhatsApp com DDD.'),
  senha: senhaForte,
  confirmarSenha: z.string(),
  aceiteTermos: marcado.refine(v => v, 'É preciso aceitar os termos de uso e a política de privacidade.')
}).refine(d => d.senha === d.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas não conferem.' });

export const loginSchema = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.'),
  lembrar: marcado
});

export const redefinirSenhaSchema = z.object({
  token: z.string().min(10),
  senha: senhaForte,
  confirmarSenha: z.string()
}).refine(d => d.senha === d.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas não conferem.' });

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.'),
  novaSenha: senhaForte,
  confirmarSenha: z.string()
}).refine(d => d.novaSenha === d.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas não conferem.' });

export const onboardingSchema = z.object({
  nomeNegocio: z.string().trim().min(1, 'Informe o nome do negócio.').max(120),
  setorId: z.coerce.number({ invalid_type_error: 'Escolha o setor do seu negócio.' }).int().positive('Escolha o setor do seu negócio.'),
  formas: z.array(z.object({
    tipo: z.enum(TIPOS_PAGAMENTO),
    ativo: z.boolean(),
    taxaPercentual: z.number().min(0, 'A taxa deve ficar entre 0% e 100%.').max(100, 'A taxa deve ficar entre 0% e 100%.')
  })).refine(f => f.some(x => x.ativo), 'Deixe pelo menos uma forma de pagamento marcada.'),
  produto: z.object({ nome: z.string().trim().min(1).max(120), custo: z.number().min(0), preco: z.number().positive('O preço precisa ser maior que zero.') }).nullable()
});

export const produtoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do produto.').max(120),
  categoriaId: z.preprocess(v => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  codigo: textoOpcional(40),
  custo: dinheiro.pipe(z.number().min(0, 'O custo não pode ser negativo.')),
  precoVenda: dinheiro.pipe(z.number().positive('O preço de venda precisa ser maior que zero.')),
  estoque: inteiro,
  estoqueMinimo: inteiro.pipe(z.number().min(0, 'O estoque mínimo não pode ser negativo.'))
});

export const formaPagamentoSchema = z.object({
  id: z.coerce.number().int().min(0).default(0),
  tipo: z.enum(TIPOS_PAGAMENTO),
  nome: z.string().trim().min(1, 'Informe o nome.').max(40),
  taxaPercentual: dinheiro.pipe(z.number().min(0, 'A taxa deve ficar entre 0% e 100%.').max(100, 'A taxa deve ficar entre 0% e 100%.')),
  taxaFixa: dinheiro.pipe(z.number().min(0, 'A taxa fixa não pode ser negativa.')),
  ativo: marcado
});

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente.').max(120),
  telefone,
  documento: textoOpcional(20),
  observacao: textoOpcional(500)
});

export const negocioSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do negócio.').max(120),
  setorId: z.preprocess(v => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  telefone,
  permitirEstoqueNegativo: marcado
});

export const perfilSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').max(120),
  email,
  telefone
});

export const conviteSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(120),
  email
});

export const novaVendaSchema = z.object({
  itens: z.array(z.object({ produtoId: z.number().int().positive(), quantidade: z.number().int().positive('A quantidade precisa ser maior que zero.') }))
    .min(1, 'Adicione pelo menos 1 produto à venda.'),
  desconto: z.number().min(0, 'O desconto não pode ser negativo.'),
  descontoEmPercentual: z.boolean(),
  formaPagamentoId: z.number().int().positive('Escolha a forma de pagamento.'),
  clienteId: z.number().int().positive().nullable(),
  qtdParcelas: z.number().int().min(1).max(MAX_PARCELAS, `Informe de 1 a ${MAX_PARCELAS} parcelas.`),
  primeiroVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  observacao: z.string().max(500).nullable().optional()
}).refine(v => !v.descontoEmPercentual || v.desconto <= 100, { path: ['desconto'], message: 'O desconto não pode passar de 100%.' });

export type NovaVenda = z.infer<typeof novaVendaSchema>;

/** Primeira mensagem de erro do zod, para mostrar na tela. */
export function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Confira os dados informados.';
}

/** Erros por campo: { campo: mensagem }. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const r: Record<string, string> = {};
  for (const i of erro.issues) {
    const k = i.path.join('.') || '_';
    r[k] ??= i.message;
  }
  return r;
}
