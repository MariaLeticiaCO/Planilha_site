// Cria (ou recria) o banco SQLite de demonstração: node scripts/criar-banco-demo.mjs
import fs from 'node:fs';
import Database from 'better-sqlite3';

const arquivo = process.env.SQLITE_PATH ?? 'controle-vendas-demo.db';
for (const sufixo of ['', '-wal', '-shm']) fs.rmSync(arquivo + sufixo, { force: true });
const db = new Database(arquivo);
db.exec(fs.readFileSync('database/sqlite_demo.sql', 'utf8'));
console.log(`Banco de demonstração criado em ${arquivo}`);
