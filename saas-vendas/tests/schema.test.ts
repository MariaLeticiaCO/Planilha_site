import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SCRIPT_SCHEMA } from '@/server/db/schema-sql';
import { lotesDoScript } from '@/server/db/preparar';

describe('Script do banco', () => {
  it('a cópia embutida é idêntica a database/controle_vendas_schema.sql', () => {
    expect(SCRIPT_SCHEMA).toBe(fs.readFileSync(path.resolve('database/controle_vendas_schema.sql'), 'utf8'));
  });
  it('divide nos GO e cada view/procedure fica sozinha no seu lote', () => {
    const lotes = lotesDoScript(SCRIPT_SCHEMA);
    expect(lotes.some(l => /^\s*GO\s*$/im.test(l))).toBe(false);
    const criacoes = lotes.filter(l => /CREATE OR ALTER (VIEW|PROCEDURE)/i.test(l));
    expect(criacoes).toHaveLength(5);
    for (const l of criacoes) expect(l.match(/CREATE OR ALTER/gi)).toHaveLength(1);
    expect(lotes.filter(l => /CREATE TABLE/i.test(l))).toHaveLength(10);
  });
});
