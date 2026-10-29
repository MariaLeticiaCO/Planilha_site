import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SCRIPT_POSTGRES, SCRIPT_SCHEMA } from '@/server/db/schema-sql';
import { comandosDoScript, lotesDoScript } from '@/server/db/preparar';
import { resolverProvedor } from '@/server/db/conexao';

const ler = (arquivo: string) => fs.readFileSync(path.resolve('database', arquivo), 'utf8');

describe('Scripts do banco', () => {
  it('as cópias embutidas são idênticas aos arquivos .sql', () => {
    expect(SCRIPT_POSTGRES).toBe(ler('postgres_schema.sql'));
    expect(SCRIPT_SCHEMA).toBe(ler('controle_vendas_schema.sql'));
  });
  it('PostgreSQL: divide em comandos sem quebrar os ";" das categorias', () => {
    const cmds = comandosDoScript(SCRIPT_POSTGRES);
    expect(cmds.filter(c => /^CREATE TABLE/i.test(c))).toHaveLength(10);
    expect(cmds.filter(c => /^CREATE OR REPLACE VIEW/i.test(c))).toHaveLength(1);
    expect(cmds.find(c => c.startsWith('INSERT INTO "Setor"'))).toContain('Blusas;Calças;Vestidos;Acessórios');
  });
  it('SQL Server: divide nos GO e cada view/procedure fica sozinha no lote', () => {
    const lotes = lotesDoScript(SCRIPT_SCHEMA);
    const criacoes = lotes.filter(l => /CREATE OR ALTER (VIEW|PROCEDURE)/i.test(l));
    expect(criacoes).toHaveLength(5);
    expect(lotes.filter(l => /CREATE TABLE/i.test(l))).toHaveLength(10);
  });
});

describe('Escolha do banco', () => {
  it('usa o PostgreSQL da Vercel quando DATABASE_URL existe', () => {
    expect(resolverProvedor({ DATABASE_URL: 'postgres://x' })).toBe('postgres');
    expect(resolverProvedor({ POSTGRES_URL: 'postgres://x' })).toBe('postgres');
    // DATABASE_PROVIDER=mssql sem SQL Server configurado: usa o Neon
    expect(resolverProvedor({ DATABASE_PROVIDER: 'mssql', DATABASE_URL: 'postgres://x' })).toBe('postgres');
  });
  it('respeita SQL Server e SQLite quando configurados', () => {
    expect(resolverProvedor({ DATABASE_PROVIDER: 'mssql', SQLSERVER_CONNECTION_STRING: 'Server=x' })).toBe('mssql');
    expect(resolverProvedor({ SQLSERVER_CONNECTION_STRING: 'Server=x' })).toBe('mssql');
    expect(resolverProvedor({ DATABASE_PROVIDER: 'sqlite', DATABASE_URL: 'postgres://x' })).toBe('sqlite');
  });
});
