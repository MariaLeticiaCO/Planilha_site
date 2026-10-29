import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, ChevronRight, Clock, MessageCircle, Smartphone, Sparkles, TrendingUp } from 'lucide-react';
import { PLANOS } from '@/domain/planos';
import { formatarMoeda } from '@/domain/formatos';

const perguntas: [string, string][] = [
  ['Preciso instalar alguma coisa?', 'Não. Funciona no navegador do celular e do computador. Se quiser, toque em “Adicionar à tela inicial” e ele vira um app no seu celular.'],
  ['Como vocês calculam o lucro?', 'Em cada venda: valor vendido, menos o desconto, menos a taxa da maquininha ou do Pix, menos o custo dos produtos. Você vê o lucro líquido de verdade, não só o faturamento.'],
  ['Serve para quem vende no Instagram, WhatsApp e feira?', 'Foi feito para isso. Registrar uma venda leva menos de 15 segundos no celular, e o crediário (fiado) fica organizado com cobrança pronta no WhatsApp.'],
  ['O teste grátis pede cartão?', 'Não. São 7 dias com tudo do plano Pro liberado. Depois você escolhe se quer continuar.'],
  ['E se o teste acabar?', 'Seus dados continuam lá. Você ainda entra e vê o painel; só não registra vendas novas até assinar.'],
  ['Meus dados ficam seguros?', 'Sim. Senhas criptografadas, conexão segura (HTTPS), backup diário e cada negócio só enxerga os próprios dados. Você pode excluir sua conta quando quiser.']
];

export default function Landing() {
  const basico = PLANOS[0];
  const mensal = PLANOS[1];
  const anual = PLANOS[2];
  return (
    <>
      {/* Hero */}
      <section className="fundo-grade relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-marca-50/80 via-white/60 to-white" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <span className="chip-marca mb-5"><Sparkles className="h-3.5 w-3.5" /> Para quem vende no Insta, no Zap e na feira</span>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] text-slate-900 sm:text-6xl">
              Saiba quanto você <span className="bg-gradient-to-r from-marca-600 to-fuchsia-500 bg-clip-text text-transparent">lucra de verdade</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Registre a venda em segundos pelo celular e veja o lucro do dia, da semana, do mês e do ano — já descontando o custo do produto e a taxa da maquininha.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="btn-primario btn-lg shadow-destaque">Testar grátis 7 dias <ArrowRight className="h-5 w-5" /></Link>
              <a href="#planos" className="btn-secundario btn-lg">Ver planos</a>
            </div>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />Pronto em 2 minutos</span>
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-marca-200/60 to-fuchsia-200/40 blur-2xl" />
            <Image src="/img/print-painel.png" alt="Print do painel com faturamento, lucro líquido, gráfico e formas de pagamento" width={1600} height={1067} priority
              className="w-full rounded-2xl border border-slate-200/80 shadow-2xl shadow-marca-900/15" />
            <Image src="/img/print-celular.png" alt="Tela de nova venda no celular" width={780} height={1688}
              className="absolute -bottom-10 -left-4 hidden w-36 rounded-[1.8rem] border-[5px] border-slate-900 shadow-2xl sm:block lg:-left-12 lg:w-44" />
          </div>
        </div>
      </section>

      {/* 3 benefícios */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [TrendingUp, 'Lucro líquido em tempo real', 'Cada venda já desconta custo e taxa. Veja hoje, semana, mês ou ano, com gráfico e ranking dos produtos que mais (e menos) vendem.'],
            [Clock, 'Venda registrada em 15 segundos', 'Busque o produto, toque no +, escolha Pix, dinheiro, cartão ou crediário. Pronto — e ainda manda o recibo no WhatsApp.'],
            [MessageCircle, 'Crediário sem caderninho', 'Parcelas geradas sozinhas, lista de quem está atrasado e botão de cobrar com a mensagem pronta no WhatsApp.']
          ].map(([Icone, titulo, texto]) => {
            const I = Icone as typeof TrendingUp;
            return (
              <div key={titulo as string} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-marca-500 to-marca-700 text-white shadow-destaque"><I className="h-6 w-6" /></span>
                <h2 className="text-lg font-bold">{titulo as string}</h2>
                <p className="mt-2 leading-relaxed text-slate-600">{texto as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Planos e preços */}
      <section id="planos" className="scroll-mt-20 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center sobretitulo text-marca-700">Planos e preços</p>
          <h2 className="mt-2 text-center text-3xl font-extrabold sm:text-4xl">Simples e justo para quem está começando</h2>
          <p className="mt-3 text-center text-slate-600">Comece com 7 dias grátis com tudo do Pro.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="card flex flex-col p-6">
              <h3 className="font-bold">Teste</h3>
              <p className="mt-3"><span className="font-display text-4xl font-extrabold">Grátis</span> <span className="text-slate-500">por 7 dias</span></p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600">
                {['Tudo do plano Pro', 'Sem cartão de crédito', 'Seus dados ficam guardados'].map(i => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{i}</li>)}
              </ul>
              <Link href="/cadastro" className="btn-secundario mt-6">Começar teste</Link>
            </div>
            <div className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-marca-600 to-marca-800 p-6 text-white shadow-destaque">
              <span className="chip absolute right-4 top-4 bg-white/15 text-white">Mais escolhido</span>
              <h3 className="font-bold">Pro</h3>
              <p className="mt-3"><span className="font-display text-4xl font-extrabold">{formatarMoeda(mensal.preco)}</span> <span className="text-marca-100">/mês</span></p>
              <p className="text-sm text-marca-100">ou {formatarMoeda(anual.preco)} por ano</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-marca-50">
                {mensal.inclui.map(i => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0" />{i}</li>)}
              </ul>
              <Link href="/cadastro" className="btn mt-6 bg-white text-marca-700 hover:bg-marca-50">Testar grátis 7 dias</Link>
            </div>
            <div className="card flex flex-col p-6">
              <h3 className="font-bold">{basico.nome}</h3>
              <p className="mt-3"><span className="font-display text-4xl font-extrabold">{formatarMoeda(basico.preco)}</span> <span className="text-slate-500">{basico.periodicidade}</span></p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600">
                {basico.inclui.map(i => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{i}</li>)}
              </ul>
              <Link href="/cadastro" className="btn-secundario mt-6">Testar grátis 7 dias</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          {perguntas.map(([p, r]) => (
            <details key={p} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900">
                {p}<ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
              </summary>
              <p className="mt-3 leading-relaxed text-slate-600">{r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-marca-700 via-marca-600 to-fuchsia-600 px-6 py-14 text-center text-white sm:px-12">
          <Smartphone className="mx-auto mb-4 h-10 w-10 opacity-90" />
          <h2 className="text-3xl font-extrabold sm:text-4xl">Pare de vender no escuro</h2>
          <p className="mx-auto mt-3 max-w-xl text-marca-100">Em 2 minutos você configura e já vê quanto ganhou hoje.</p>
          <Link href="/cadastro" className="btn btn-lg mt-8 bg-white text-marca-700 hover:bg-marca-50">Testar grátis 7 dias <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>
    </>
  );
}
