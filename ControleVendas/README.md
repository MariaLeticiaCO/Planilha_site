# SaaS Controle de Vendas

Sistema web (instalável no celular como PWA) que mostra ao pequeno empreendedor quanto ele **lucrou de verdade** no dia, na semana, no mês e no ano — descontando o custo do produto e a taxa da forma de pagamento.

Feito seguindo o *Documento do Projeto*: ASP.NET Core 8 MVC + SQL Server, 4 camadas, 10 tabelas, 1 view, 4 procedures, 17 telas mobile first (barra inferior no celular, menu lateral no computador).

## Como rodar

### Com SQL Server (o caminho do documento)

1. Crie o banco no SSMS: `CREATE DATABASE ControleVendas;`
2. Rode `database/controle_vendas_schema.sql` nesse banco (tabelas, view, procedures, índices e setores).
3. Ajuste a connection string em `src/ControleVendas.Web/appsettings.Development.json`.
4. Abra `ControleVendas.sln` no Visual Studio 2022 e rode o projeto **ControleVendas.Web** (perfil `http` ou `https`).
   Ou pelo terminal: `dotnet run --project src/ControleVendas.Web`

> Em desenvolvimento, `Database:CriarSchemaAutomaticamente = true`: se o banco estiver vazio, o próprio app roda o script na primeira execução.

### Modo demonstração (sem SQL Server)

Para testar rápido em qualquer máquina, existe o ambiente `Demo`, que usa um arquivo SQLite:

```bash
dotnet run --project src/ControleVendas.Web --launch-profile demo-sqlite
```

Abra http://localhost:5118, clique em **Testar grátis 7 dias** e siga o onboarding. No modo demo o painel usa consultas LINQ equivalentes às procedures (o SQLite não tem stored procedures). Em produção use sempre SQL Server.

### Testes

```bash
dotnet test
```

Testes unitários de `CalculadoraLucro`, `GeradorParcelas`, regras de assinatura, períodos do dashboard e link do WhatsApp.

## Configuração

Em produção, configure por **variáveis de ambiente** (nunca no código):

| Variável | Para quê |
|---|---|
| `ConnectionStrings__Default` | Connection string do SQL Server / Azure SQL |
| `Asaas__ApiKey` | Chave da API do Asaas. Vazia = gateway simulado (só para desenvolvimento) |
| `Asaas__UrlBase` | `https://api.asaas.com/v3` (produção) ou `https://api-sandbox.asaas.com/v3` |
| `Asaas__TokenWebhook` | Token configurado no webhook do Asaas (header `asaas-access-token`) |
| `Smtp__Host`, `Smtp__Porta`, `Smtp__Usuario`, `Smtp__Senha`, `Smtp__Remetente` | E-mail (Brevo ou SendGrid). Sem SMTP o e-mail vai para o log |

**Webhook do Asaas:** no painel do Asaas, aponte para `https://seudominio.com.br/webhook/pagamento`, com os eventos de cobrança (`PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`) e de assinatura, e defina o mesmo token de `Asaas__TokenWebhook`.

## Estrutura

```
ControleVendas.sln
├── database/controle_vendas_schema.sql   10 tabelas, vw_ParcelasCrediario, 4 sp_Dashboard_*, índices
├── src/
│   ├── ControleVendas.Web            Controllers, Views (Razor + Tailwind), Filters, Middlewares, wwwroot (PWA)
│   ├── ControleVendas.Application    Services, DTOs, Validators (FluentValidation), Interfaces
│   ├── ControleVendas.Domain         Entities, Enums, Rules (CalculadoraLucro, GeradorParcelas)
│   └── ControleVendas.Infra          AppDbContext (filtro global por EmpresaId), Mappings, Repositories,
│                                     Queries (Dapper), Payments (Asaas), Email, Exports (QuestPDF/ClosedXML)
└── tests/ControleVendas.Tests        xUnit
```

A Web nunca acessa o banco direto: passa pela Application. O isolamento entre empresas é feito pelo `HasQueryFilter` do EF Core em cada entidade, e o `EmpresaId` é preenchido no `SaveChanges` a partir do cookie de login.

## O que foi implementado (mapa do documento)

| Documento | Onde está |
|---|---|
| Lucro = (Bruto − Desconto) − Taxa − Custo | `Domain/Rules/CalculadoraLucro.cs` + colunas calculadas `ValorLiquido`/`Lucro` |
| Parcelas: diferença de centavos na última, a cada 30 dias | `Domain/Rules/GeradorParcelas.cs` |
| Venda + itens + parcelas + estoque numa transação | `Application/Services/VendaService.cs` |
| Venda só cancela (devolve estoque, cancela parcelas abertas) | `VendaService.CancelarAsync` |
| Estoque negativo avisa, não bloqueia (configurável) | `Empresa.PermitirEstoqueNegativo` |
| Onboarding por setor (categorias + 5 formas com taxa zero) | `OnboardingService` |
| Trial 7 dias / `AssinaturaAtivaFilter` / webhook | `Web/Filters`, `AssinaturaService`, `WebhookController` |
| Limites do Básico (50 produtos, 1 usuário) checados no Service | `ProdutoService`, `ConfiguracaoService` |
| Perfis Dono / Vendedor | `[Authorize(Roles = "DONO")]` + Services (vendedor vê só as próprias vendas, sem lucro/custo) |
| Senha com `PasswordHasher`, cookie HttpOnly/Secure 7 dias, bloqueio após 5 erros | `AuthService`, `Program.cs` |
| `[ValidateAntiForgeryToken]` em todo POST, HTTPS + HSTS | `Program.cs` (filtro global) |
| LGPD: termos, privacidade, excluir conta e dados | `/termos`, `/privacidade`, Configurações → Excluir conta |
| Recibo e relatórios em PDF/Excel | `Infra/Exports/ExportadorRelatorios.cs` |
| PWA: manifest, ícones e service worker | `wwwroot/manifest.json`, `wwwroot/service-worker.js` |
| Logs | Serilog (console + `logs/controle-vendas-AAAAMMDD.log`) |

### Telas (todas mobile first)

T01 Landing `/` · T02 Cadastro `/cadastro` · T03 Login `/login` · T04 Recuperar senha `/recuperar-senha` · T05 Onboarding `/comecar` · T06 Dashboard `/painel` · T07 PDV `/vendas/nova` · T08 Histórico `/vendas/historico` · T09/T10 Produtos `/produtos` · T11 Categorias `/categorias` · T12 Formas de pagamento `/formas-pagamento` · T13 Clientes `/clientes` · T14 Crediário `/crediario` · T15 Relatórios `/relatorios` · T16 Configurações `/configuracoes` · T17 Assinatura `/assinatura`

## Deploy

1. Publique: `dotnet publish src/ControleVendas.Web -c Release -o publicar`
2. **Azure App Service** (com Azure SQL) ou **VPS** Windows/Linux (atrás de Nginx/IIS com HTTPS). O app já respeita `X-Forwarded-*`.
3. Configure as variáveis de ambiente da tabela acima e `ASPNETCORE_ENVIRONMENT=Production`.
4. Rode `database/controle_vendas_schema.sql` no banco de produção (ou o banco de homologação, separado).
5. Ative o backup diário do banco (no Azure SQL já vem ligado).

O workflow `.github/workflows/controle-vendas.yml` compila e roda os testes a cada push que mexe em `ControleVendas/`.

### Front-end

O CSS do Tailwind já vai pronto em `wwwroot/css/tailwind.css`. Só se mudar classes nas views:

```bash
cd src/ControleVendas.Web && npm install && npm run css
```

## Próximos passos (versão 2 do documento)

Pagamento parcial e juros, lembrete automático de cobrança, catálogo público com pedido no WhatsApp, metas e comparação com o período anterior, leitura de código de barras pela câmera, múltiplas lojas por conta.
