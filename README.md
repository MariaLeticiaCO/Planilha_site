# Minhas Finanças 2027 — Página de vendas

Landing page estática da planilha **Minhas Finanças 2027**. Todos os botões levam ao checkout da Kiwify.

- `index.html` — página completa (HTML + CSS, sem build)
- `img/` — prints reais da planilha e capa
- `vercel.json` — configuração para deploy na Vercel

Deploy: importe este repositório na Vercel (Framework: Other) e clique em Deploy.

## Estudo na Rotina — `/estudos`

Landing page da planilha **Estudo na Rotina** (organização de estudos para rotina corrida).

- `estudos/index.html` — página completa (HTML + CSS + JS, sem build), com simulador interativo da semana
- `estudos/img/` — prints reais da planilha, capa e imagem de compartilhamento
- Link do checkout: edite a variável `CHECKOUT` no fim de `estudos/index.html`

Depois do deploy, a página fica em `https://planilhasite.vercel.app/estudos`.

## SaaS Controle de Vendas — `saas-vendas/`

Sistema completo em **Next.js + React + Tailwind**, com o banco **SQL Server** do documento do projeto, para o pequeno empreendedor ver o lucro real das vendas: PDV, crediário, estoque e relatórios — no computador e no celular (PWA). Veja `saas-vendas/README.md` para publicar na Vercel (crie um projeto separado com **Root Directory = `saas-vendas`**). A pasta fica fora do deploy desta página de vendas (`.vercelignore`).
