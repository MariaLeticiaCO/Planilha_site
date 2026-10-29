import 'server-only';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { Kysely, MssqlDialect, SqliteDialect, sql, type Transaction } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import type { Banco } from './schema';

export type Db = Kysely<Banco> | Transaction<Banco>;

/** mssql (produção — o mesmo SQL Server do documento) ou sqlite (só demonstração/testes locais). */
export const provedor: 'mssql' | 'sqlite' = process.env.DATABASE_PROVIDER === 'sqlite' ? 'sqlite' : 'mssql';

const globalDb = globalThis as unknown as { __db?: Kysely<Banco> };

export function db(): Kysely<Banco> {
  if (!globalDb.__db) globalDb.__db = provedor === 'sqlite' ? criarSqlite() : criarMssql();
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

/** bit do SQL Server (boolean) ou do SQLite (0/1) → boolean. */
export const bool = (v: unknown) => v === true || v === 1 || v === '1';
/** boolean → 0/1 (os dois bancos aceitam). */
export const bit = (v: boolean) => (v ? 1 : 0);
/** decimal/numeric → number. */
export const num = (v: unknown) => (v == null ? 0 : Number(v));

/** INSERT devolvendo o Id gerado (OUTPUT no SQL Server, RETURNING no SQLite). */
export async function inserir<T extends keyof Banco>(executor: Db, tabela: T, valores: Record<string, unknown>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (executor as any).insertInto(tabela).values(valores);
  const linha = provedor === 'mssql' ? await q.output('inserted.Id').executeTakeFirstOrThrow() : await q.returning('Id').executeTakeFirstOrThrow();
  return Number(linha.Id);
}

export { sql };
