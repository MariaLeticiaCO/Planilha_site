import 'server-only';
import { db, provedor, sql } from './conexao';
import { SCRIPT_POSTGRES, SCRIPT_SCHEMA } from './schema-sql';

/** SQL Server: divide o script nos separadores GO (cada parte roda como um lote separado). */
export function lotesDoScript(script: string): string[] {
  return script.split(/^\s*GO\s*$/im).map(l => l.trim()).filter(Boolean);
}

/** PostgreSQL: divide nos ";" de fim de linha (os ";" dentro de textos, como nas categorias, ficam). */
export function comandosDoScript(script: string): string[] {
  return script
    .split(/;\s*$/m)
    .map(c => c.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

let preparo: Promise<void> | null = null;

/**
 * Se o banco estiver vazio, cria a estrutura (tabelas, view, setores e, no SQL Server, as procedures).
 * Assim não é preciso rodar script à mão: basta criar o banco Neon na Vercel.
 * Roda uma vez por instância; os scripts são idempotentes. Desligue com CRIAR_BANCO_AUTOMATICAMENTE=false.
 */
export function prepararBanco(): Promise<void> {
  if (provedor === 'sqlite' || process.env.CRIAR_BANCO_AUTOMATICAMENTE === 'false') return Promise.resolve();
  preparo ??= (async () => {
    const consulta = provedor === 'postgres'
      ? sql<{ existe: number }>`SELECT CASE WHEN to_regclass('public."Setor"') IS NULL THEN 0 ELSE 1 END AS existe`
      : sql<{ existe: number }>`SELECT CASE WHEN OBJECT_ID('dbo.Setor') IS NULL THEN 0 ELSE 1 END AS existe`;
    const r = await consulta.execute(db());
    if (Number(r.rows[0]?.existe)) return;
    console.info('[banco] banco vazio: criando a estrutura');
    const comandos = provedor === 'postgres' ? comandosDoScript(SCRIPT_POSTGRES) : lotesDoScript(SCRIPT_SCHEMA);
    if (provedor === 'postgres') {
      await db().transaction().execute(async trx => {
        for (const c of comandos) await sql.raw(c).execute(trx);
      });
    } else {
      for (const c of comandos) await sql.raw(c).execute(db());
    }
    console.info('[banco] estrutura criada');
  })().catch(e => {
    preparo = null; // tenta de novo na próxima requisição
    throw e;
  });
  return preparo;
}
