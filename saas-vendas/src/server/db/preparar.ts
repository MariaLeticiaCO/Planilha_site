import 'server-only';
import { db, provedor, sql } from './conexao';
import { SCRIPT_SCHEMA } from './schema-sql';

/** Divide o script nos separadores GO (cada parte roda como um lote separado). */
export function lotesDoScript(script: string): string[] {
  return script.split(/^\s*GO\s*$/im).map(l => l.trim()).filter(Boolean);
}

let preparo: Promise<void> | null = null;

/**
 * Se o banco SQL Server estiver vazio, roda o controle_vendas_schema.sql (tabelas, view, procedures e setores).
 * Assim não é preciso rodar o script à mão (o editor de consultas do portal do Azure não aceita GO).
 * Roda uma vez por instância; o script é idempotente. Desligue com CRIAR_BANCO_AUTOMATICAMENTE=false.
 */
export function prepararBanco(): Promise<void> {
  if (provedor !== 'mssql' || process.env.CRIAR_BANCO_AUTOMATICAMENTE === 'false') return Promise.resolve();
  preparo ??= (async () => {
    const r = await sql<{ existe: number }>`SELECT CASE WHEN OBJECT_ID('dbo.Setor') IS NULL THEN 0 ELSE 1 END AS existe`.execute(db());
    if (r.rows[0]?.existe) return;
    console.info('[banco] banco vazio: criando tabelas, view e procedures');
    for (const lote of lotesDoScript(SCRIPT_SCHEMA)) await sql.raw(lote).execute(db());
    console.info('[banco] estrutura criada');
  })().catch(e => {
    preparo = null; // tenta de novo na próxima requisição
    throw e;
  });
  return preparo;
}
