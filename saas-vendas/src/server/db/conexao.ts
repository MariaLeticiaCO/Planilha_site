import 'server-only';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { Kysely, MssqlDialect, PostgresDialect, SqliteDialect, sql, type Transaction } from 'kysely';
import pg from 'pg';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import type { Banco } from './schema';

export type Db = Kysely<Banco> | Transaction<Banco>;

export type Provedor = 'postgres' | 'mssql' | 'sqlite';

/** URL do PostgreSQL. A integração Neon da Vercel cria DATABASE_URL (e POSTGRES_URL). */
export const urlPostgres = (env: Record<string, string | undefined> = process.env) => env.DATABASE_URL || env.POSTGRES_URL || '';

/**
 * Qual banco usar:
 * - postgres: PostgreSQL (Neon, criado dentro da Vercel) — o padrão em produção;
 * - mssql: SQL Server do documento original (SQLSERVER_CONNECTION_STRING);
 * - sqlite: só demonstração/testes locais.
 * Sem DATABASE_PROVIDER, escolhe pelo que estiver configurado.
 */
export function resolverProvedor(env: Record<string, string | undefined> = process.env): Provedor {
  const escolhido = env.DATABASE_PROVIDER?.trim().toLowerCase();
  const temSqlServer = !!(env.SQLSERVER_CONNECTION_STRING || env.SQLSERVER_HOST);
  if (escolhido === 'sqlite') return 'sqlite';
  if (escolhido === 'mssql' && (temSqlServer || !urlPostgres(env))) return 'mssql';
  if (escolhido === 'postgres' || urlPostgres(env)) return 'postgres';
  return temSqlServer ? 'mssql' : 'postgres';
}

export const provedor: Provedor = resolverProvedor();

const globalDb = globalThis as unknown as { __db?: Kysely<Banco> };

export function db(): Kysely<Banco> {
  if (!globalDb.__db) globalDb.__db = provedor === 'postgres' ? criarPostgres() : provedor === 'sqlite' ? criarSqlite() : criarMssql();
  return globalDb.__db;
}

interface ConfigSqlServer {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

/**
 * Lê SQLSERVER_CONNECTION_STRING (formato ADO.NET, como o Azure mostra) ou as variáveis separadas.
 * Ex.: Server=tcp:meuserver.database.windows.net,1433;Initial Catalog=ControleVendas;User ID=app;Password=...;Encrypt=True
 */
export function lerConfigSqlServer(env = process.env): ConfigSqlServer {
  const cs = env.SQLSERVER_CONNECTION_STRING;
  if (cs) {
    const partes = Object.fromEntries(
      cs.split(';').filter(Boolean).map(p => {
        const i = p.indexOf('=');
        return [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()];
      })
    );
    const servidor = (partes['server'] ?? partes['data source'] ?? partes['address'] ?? '').replace(/^tcp:/i, '');
    const [host, porta] = servidor.split(',');
    return {
      server: host,
      port: Number(porta ?? 1433),
      database: partes['initial catalog'] ?? partes['database'] ?? 'ControleVendas',
      user: partes['user id'] ?? partes['uid'] ?? partes['user'] ?? '',
      password: partes['password'] ?? partes['pwd'] ?? '',
      encrypt: (partes['encrypt'] ?? 'true').toLowerCase() !== 'false',
      trustServerCertificate: (partes['trustservercertificate'] ?? 'false').toLowerCase() === 'true'
    };
  }
  return {
    server: env.SQLSERVER_HOST ?? 'localhost',
    port: Number(env.SQLSERVER_PORT ?? 1433),
    database: env.SQLSERVER_DATABASE ?? 'ControleVendas',
    user: env.SQLSERVER_USER ?? '',
    password: env.SQLSERVER_PASSWORD ?? '',
    encrypt: (env.SQLSERVER_ENCRYPT ?? 'true') !== 'false',
    trustServerCertificate: env.SQLSERVER_TRUST_CERT === 'true'
  };
}

function criarMssql(): Kysely<Banco> {
  const c = lerConfigSqlServer();
  return new Kysely<Banco>({
    dialect: new MssqlDialect({
      tarn: { ...Tarn, options: { min: 0, max: 10, idleTimeoutMillis: 30_000 } },
      tedious: {
        ...Tedious,
        connectionFactory: () =>
          new Tedious.Connection({
            server: c.server,
            authentication: { type: 'default', options: { userName: c.user, password: c.password } },
            options: {
              database: c.database,
              port: c.port,
              encrypt: c.encrypt,
              trustServerCertificate: c.trustServerCertificate,
              // A hora gravada é a de Brasília "de parede": lida e escrita sem conversão de fuso.
              useUTC: true,
              connectTimeout: 30_000,
              requestTimeout: 30_000
            }
          })
      }
    })
  });
}

// Datas sem fuso voltam como texto ("yyyy-MM-dd HH:mm:ss"), igual ao que foi gravado (hora de Brasília);
// numeric e bigint voltam como número.
pg.types.setTypeParser(1114, (v: string) => v); // timestamp
pg.types.setTypeParser(1082, (v: string) => v); // date
pg.types.setTypeParser(1700, (v: string) => parseFloat(v)); // numeric
pg.types.setTypeParser(20, (v: string) => parseInt(v, 10)); // bigint (count)

function criarPostgres(): Kysely<Banco> {
  const url = urlPostgres();
  if (!url) throw new Error('Configure DATABASE_URL (crie o banco Neon em Storage, no projeto da Vercel).');
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return new Kysely<Banco>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: url,
        max: 5,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 15_000,
        ...(local || /sslmode=/.test(url) ? {} : { ssl: { rejectUnauthorized: false } })
      })
    })
  });
}

function criarSqlite(): Kysely<Banco> {
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const arquivo = path.resolve(process.env.SQLITE_PATH ?? 'controle-vendas-demo.db');
  const novo = !fs.existsSync(arquivo);
  const banco = new Database(arquivo);
  banco.pragma('journal_mode = WAL');
  banco.pragma('foreign_keys = ON');
  if (novo) banco.exec(fs.readFileSync(path.resolve('database/sqlite_demo.sql'), 'utf8'));
  return new Kysely<Banco>({ dialect: new SqliteDialect({ database: banco }) });
}

/** bit do SQL Server (boolean) ou smallint do PostgreSQL/SQLite (0/1) → boolean. */
export const bool = (v: unknown) => v === true || v === 1 || v === '1';
/** boolean → 0/1 (os dois bancos aceitam). */
export const bit = (v: boolean) => (v ? 1 : 0);
/** decimal/numeric → number. */
export const num = (v: unknown) => (v == null ? 0 : Number(v));

/** INSERT devolvendo o Id gerado (OUTPUT no SQL Server, RETURNING no PostgreSQL e no SQLite). */
export async function inserir<T extends keyof Banco>(executor: Db, tabela: T, valores: Record<string, unknown>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (executor as any).insertInto(tabela).values(valores);
  const linha = provedor === 'mssql' ? await q.output('inserted.Id').executeTakeFirstOrThrow() : await q.returning('Id').executeTakeFirstOrThrow();
  return Number(linha.Id);
}

/** Operador de busca de texto sem diferenciar maiúsculas (no PostgreSQL o LIKE diferencia). */
export const contem = () => (provedor === 'postgres' ? 'ilike' : 'like') as 'like';

export { sql };
