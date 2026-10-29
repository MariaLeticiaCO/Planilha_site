# SaaS Controle de Vendas

Sistema web (instalável no celular como PWA) que mostra ao pequeno empreendedor quanto ele **lucrou de verdade** no dia, na semana, no mês e no ano — descontando o custo do produto e a taxa da forma de pagamento.

**Stack:** Next.js 15 (App Router) + React 19 + Tailwind CSS + TypeScript, rodando na **Vercel**, com banco **PostgreSQL (Neon)** criado dentro da própria Vercel. As tabelas, a view e as regras são as do documento do projeto (`database/postgres_schema.sql`). O script original para SQL Server continua em `database/controle_vendas_schema.sql` e o app também funciona com ele.

## Colocar no ar na Vercel (passo a passo)

### 1. Projeto
1. Em vercel.com → **Add New → Project**, importe o repositório.
   - Se o app estiver na pasta `saas-vendas/` de outro repositório, em **Root Directory** escolha `saas-vendas`. Não liste `saas-vendas/` num `.vercelignore` na raiz do repositório: a Vercel aplica esse arquivo a todos os projetos e apagaria o app antes do build.
2. Framework: **Next.js** (detectado sozinho).

### 2. Banco de dados (Neon, dentro da Vercel)
1. No projeto, abra a aba **Storage → Create Database → Neon** (Serverless Postgres) e escolha o plano gratuito e a região mais próxima (ex.: São Paulo, se houver; senão Washington).
2. Conecte o banco ao projeto, marcando os ambientes **Production** e **Preview**. A Vercel cria sozinha a variável `DATABASE_URL`.
3. **Não precisa rodar script:** no primeiro acesso, o app cria as tabelas, a view e os setores no banco vazio.

### 3. Variáveis de ambiente
Em **Settings → Environment Variables**:

| Variável | Valor |
|---|---|
| `SESSION_SECRET` | texto aleatório com 32+ caracteres (obrigatório) |
| `ASAAS_API_KEY`, `ASAAS_URL`, `ASAAS_WEBHOOK_TOKEN` | pagamento da assinatura (opcional; sem chave, a cobrança fica simulada) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | e-mail de recuperação de senha e convites (opcional) |

`DATABASE_PROVIDER` não é necessária: com `DATABASE_URL` o app usa o PostgreSQL. Se ela existir com `mssql` e não houver SQL Server configurado, o app usa o Neon mesmo assim.

### 4. Fotos (Vercel Blob)
Em **Storage → Create → Blob**, crie um Blob store e conecte ao projeto (cria `BLOB_READ_WRITE_TOKEN`). O disco da Vercel é temporário, então as fotos dos produtos e logos ficam lá.

### 5. Deploy
Clique em **Redeploy** (variáveis novas só valem em um deploy novo) e abra o site → *Testar grátis 7 dias*.

### Webhook do Asaas
No painel do Asaas → Integrações → Webhooks, aponte para `https://SEU-DOMINIO/webhook/pagamento`, com os eventos de cobrança e de assinatura, e o token igual ao `ASAAS_WEBHOOK_TOKEN`.

### Usar SQL Server em vez do Neon
Defina `SQLSERVER_CONNECTION_STRING` (formato ADO.NET) e `DATABASE_PROVIDER=mssql`. Os números do dashboard passam a vir das procedures `sp_Dashboard_*`, e o app também cria a estrutura sozinho no banco vazio.

## Rodar no seu computador

```bash
npm install
cp .env.example .env.local   # coloque a DATABASE_URL de um PostgreSQL (pode ser a do Neon)
npm run dev                   # http://localhost:3000
```

**Sem banco nenhum?** Use o modo demonstração com SQLite (só para testar):

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
│   ├── postgres_schema.sql          o banco em PostgreSQL (Neon) — usado na Vercel
│   ├── controle_vendas_schema.sql   o banco do documento em SQL Server (mesmas tabelas)
│   └── sqlite_demo.sql              cópia em SQLite, só para o modo demonstração
├── src/
│   ├── domain/        regras puras: CalculadoraLucro, GeradorParcelas, datas, planos, validação (zod)
│   ├── server/
│   │   ├── db/        conexão (Kysely: PostgreSQL, SQL Server ou SQLite), criação automática do banco, consultas do dashboard
│   │   ├── services/  auth, onboarding, cadastros, vendas, crediário, painel, relatórios, configurações, assinatura
│   │   ├── infra/     Asaas, e-mail, armazenamento de imagens, PDF (PDFKit) e Excel (ExcelJS)
│   │   ├── sessao.ts  cookie HttpOnly com JWT, 7 dias com renovação
│   │   └── seguranca.ts  hash de senha no formato do ASP.NET Identity
│   ├── app/           telas (App Router), server actions (acoes/) e rotas JSON/PDF
│   ├── components/    UI compartilhada (menu lateral, barra inferior, formulários, toasts)
│   └── middleware.ts  protege a área logada
└── tests/             vitest
```

### Banco
- PostgreSQL, SQL Server e SQLite têm as mesmas tabelas, colunas calculadas (margem, valor líquido, lucro) e a view `vw_ParcelasCrediario`.
- Se editar um `.sql` de `database/`, rode `python3 scripts/embutir-schemas.py` (o app usa uma cópia embutida para criar o banco; um teste confere que estão iguais).
- O hash de senha usa o formato do `PasswordHasher` do ASP.NET Core.
- Datas gravadas na hora de Brasília.

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
