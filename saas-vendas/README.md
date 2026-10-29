# SaaS Controle de Vendas

Sistema web (instalável no celular como PWA) que mostra ao pequeno empreendedor quanto ele **lucrou de verdade** no dia, na semana, no mês e no ano — descontando o custo do produto e a taxa da forma de pagamento.

**Stack:** Next.js 15 (App Router) + React 19 + Tailwind CSS + TypeScript, rodando na **Vercel**, com o **mesmo banco SQL Server** do documento do projeto (`database/controle_vendas_schema.sql`: 10 tabelas, 1 view, 4 procedures).

## Colocar no ar na Vercel (passo a passo)

### 1. Banco SQL Server na nuvem
A Vercel não hospeda SQL Server, então o banco fica num serviço gerenciado. O mais simples é o **Azure SQL Database** (tem oferta gratuita):

1. No portal do Azure, crie um **Banco de Dados SQL** chamado `ControleVendas` (autenticação SQL, com usuário e senha).
2. Em **Rede/Firewall** do servidor, permita o acesso público e libere os IPs de `0.0.0.0` a `255.255.255.255` (a Vercel não tem IP fixo; o acesso continua protegido por usuário/senha e criptografia).
3. Abra o **Editor de consultas** do banco (ou o SSMS) e rode o arquivo `database/controle_vendas_schema.sql` inteiro.
4. Copie a **connection string ADO.NET** (menu *Cadeias de conexão*) e troque `{your_password}` pela senha.

### 2. Projeto na Vercel
1. Em vercel.com → **Add New → Project**, importe o repositório.
   - Se o app estiver na pasta `saas-vendas/` de outro repositório, em **Root Directory** escolha `saas-vendas`.
2. Framework: **Next.js** (detectado sozinho). Não precisa mudar build nem output.
3. Em **Environment Variables**, cadastre:

| Variável | Valor |
|---|---|
| `DATABASE_PROVIDER` | `mssql` |
| `SQLSERVER_CONNECTION_STRING` | a connection string do passo 1 |
| `SESSION_SECRET` | um texto aleatório de 32+ caracteres (`openssl rand -base64 48`) |
| `ASAAS_API_KEY` | chave da API do Asaas (sem ela, a cobrança fica simulada) |
| `ASAAS_URL` | `https://api.asaas.com/v3` (produção) ou `https://api-sandbox.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | o mesmo token que você definir no webhook do Asaas |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | e-mail (Brevo ou SendGrid), para recuperação de senha e convites |

4. Em **Storage → Create → Blob**, crie um Blob store e conecte ao projeto (cria `BLOB_READ_WRITE_TOKEN` sozinho). É onde ficam as fotos dos produtos e logos — o disco da Vercel é temporário.
5. **Deploy.** Pronto: abra a URL, clique em *Testar grátis 7 dias*.

### 3. Webhook do Asaas
No painel do Asaas → Integrações → Webhooks, aponte para `https://SEU-DOMINIO/webhook/pagamento`, com os eventos de cobrança e de assinatura, e o token igual ao `ASAAS_WEBHOOK_TOKEN`.

## Rodar no seu computador

```bash
npm install
cp .env.example .env.local   # preencha a connection string do seu SQL Server
npm run dev                   # http://localhost:3000
```

**Sem SQL Server?** Use o modo demonstração com SQLite (só para testar; em produção é sempre SQL Server):

```bash
echo "DATABASE_PROVIDER=sqlite" > .env.local
npm run dev
```

## Testes

```bash
npm test          # regras de lucro, parcelas, assinatura, períodos, hash de senha
npm run typecheck
```

## Estrutura

```
saas-vendas/
├── database/
│   ├── controle_vendas_schema.sql   o banco do documento (SQL Server) — o mesmo da versão .NET
│   └── sqlite_demo.sql              cópia em SQLite, só para o modo demonstração
├── src/
│   ├── domain/        regras puras: CalculadoraLucro, GeradorParcelas, datas, planos, validação (zod)
│   ├── server/
│   │   ├── db/        conexão (Kysely: SQL Server em produção), tipos das tabelas, procedures do dashboard
│   │   ├── services/  auth, onboarding, cadastros, vendas, crediário, painel, relatórios, configurações, assinatura
│   │   ├── infra/     Asaas, e-mail, armazenamento de imagens, PDF (PDFKit) e Excel (ExcelJS)
│   │   ├── sessao.ts  cookie HttpOnly com JWT, 7 dias com renovação
│   │   └── seguranca.ts  hash de senha no formato do ASP.NET Identity
│   ├── app/           telas (App Router), server actions (acoes/) e rotas JSON/PDF
│   ├── components/    UI compartilhada (menu lateral, barra inferior, formulários, toasts)
│   └── middleware.ts  protege a área logada
└── tests/             vitest
```

### Compatível com o banco da versão .NET
- As tabelas, a view `vw_ParcelasCrediario` e as procedures `sp_Dashboard_*` são exatamente as do `controle_vendas_schema.sql`.
- O hash de senha usa o mesmo formato do `PasswordHasher` do ASP.NET Core: usuários criados por uma versão entram pela outra.
- Datas gravadas na hora de Brasília, como antes.

## Mapa do documento

| Regra | Onde |
|---|---|
| Lucro = (Bruto − Desconto) − Taxa − Custo | `src/domain/calculadora.ts` + colunas calculadas do banco |
| Parcelas: centavos na última, a cada 30 dias | `src/domain/parcelas.ts` |
| Venda + itens + parcelas + estoque numa transação | `src/server/services/vendas.ts` |
| Venda só cancela (devolve estoque, cancela parcelas abertas) | `cancelarVenda` |
| Isolamento por empresa | todo acesso ao banco filtra pelo `EmpresaId` da sessão (nunca vindo da tela) |
| Perfis Dono/Vendedor | `exigirDono()` nas telas e regras nos services |
| Trial 7 dias, bloqueio de vendas, webhook | `src/domain/planos.ts`, `services/assinatura.ts`, `/webhook/pagamento` |
| Senhas com hash, bloqueio após 5 erros, cookie seguro | `seguranca.ts`, `services/auth.ts`, `sessao.ts` |
| CSRF | server actions do Next (checagem de origem) |
| HTTPS/HSTS e cabeçalhos de segurança | `next.config.ts` |
| LGPD: termos, privacidade, excluir conta | `/termos`, `/privacidade`, Configurações |
| PWA | `src/app/manifest.ts`, `public/sw.js` |

### Telas (todas mobile first)
T01 `/` · T02 `/cadastro` · T03 `/login` · T04 `/recuperar-senha` · T05 `/comecar` · T06 `/painel` · T07 `/vendas/nova` · T08 `/vendas/historico` · T09/T10 `/produtos` · T11 `/categorias` · T12 `/formas-pagamento` · T13 `/clientes` · T14 `/crediario` · T15 `/relatorios` · T16 `/configuracoes` · T17 `/assinatura`
