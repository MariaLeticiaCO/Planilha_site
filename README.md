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

## SaaS Controle de Vendas — `ControleVendas/`

Sistema completo (ASP.NET Core 8 MVC + SQL Server) para o pequeno empreendedor ver o lucro real das vendas, com PDV, crediário, estoque e relatórios — funciona no computador e no celular (PWA). Veja `ControleVendas/README.md`. Não é publicado na Vercel (está no `.vercelignore`); hospede no Azure App Service ou em uma VPS.
