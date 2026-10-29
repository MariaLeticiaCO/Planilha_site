export const metadata = { title: 'Política de privacidade' };

export default function Privacidade() {
  const itens: [string, string][] = [
    ['Quais dados coletamos', 'Seu nome, e-mail e WhatsApp (cadastro); os dados do seu negócio (produtos, vendas, clientes e parcelas) que você mesmo registra; e registros técnicos de acesso para segurança.'],
    ['Para que usamos', 'Para prestar o serviço, calcular seus relatórios, enviar e-mails de recuperação de senha e avisos da conta, e processar a cobrança da assinatura.'],
    ['Com quem compartilhamos', 'Apenas com prestadores necessários para o funcionamento: hospedagem, envio de e-mails e o gateway de pagamento. Não vendemos seus dados.'],
    ['Dados dos seus clientes', 'Os nomes e telefones dos seus clientes são tratados em seu nome, só para o funcionamento do sistema. Cada negócio enxerga apenas os próprios dados.'],
    ['Segurança', 'Senhas guardadas com criptografia (hash), conexão HTTPS, backup diário e controle de acesso por perfil.'],
    ['Seus direitos', 'Você pode acessar, corrigir e exportar seus dados, e excluir a conta com todos os dados em Configurações → Excluir conta.'],
    ['Retenção', 'Mantemos os dados enquanto a conta existir. Ao excluir a conta, os dados são apagados do banco principal; cópias de backup expiram em até 30 dias.']
  ];
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="titulo-pagina">Política de privacidade</h1>
      <p className="subtitulo mt-1">Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
      <div className="mt-8 space-y-5 leading-relaxed text-slate-700">
        {itens.map(([t, x]) => <p key={t}><b>{t}.</b> {x}</p>)}
      </div>
    </article>
  );
}
