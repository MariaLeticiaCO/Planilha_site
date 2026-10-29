export const metadata = { title: 'Termos de uso' };

export default function Termos() {
  const itens: [string, string][] = [
    ['O serviço', 'O Controle de Vendas é um software online para registrar vendas, produtos, clientes e crediário e calcular o lucro do seu negócio.'],
    ['Conta', 'Você é responsável pelos dados informados, pela guarda da sua senha e pelos usuários (vendedores) que convidar.'],
    ['Teste e planos', 'Toda conta nova tem 7 dias de teste grátis com os recursos do plano Pro. Depois disso, é preciso escolher um plano para registrar vendas novas. O acesso ao painel e aos dados continua disponível.'],
    ['Pagamento', 'O plano Básico é pago uma única vez. O plano Pro é cobrado por mês ou por ano, via Pix ou cartão, por meio do nosso parceiro de pagamentos. Você pode cancelar quando quiser; o acesso vale até o fim do período pago.'],
    ['Uso adequado', 'É proibido usar o serviço para atividades ilegais ou para tentar acessar dados de outros clientes.'],
    ['Responsabilidade', 'Os cálculos de lucro dependem dos custos e taxas informados por você. O serviço não substitui orientação contábil.'],
    ['Encerramento', 'Você pode excluir sua conta e todos os dados em Configurações, a qualquer momento.']
  ];
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="titulo-pagina">Termos de uso</h1>
      <ol className="mt-8 space-y-5 leading-relaxed text-slate-700">
        {itens.map(([t, x], i) => <li key={t}><b>{i + 1}. {t}.</b> {x}</li>)}
      </ol>
    </article>
  );
}
