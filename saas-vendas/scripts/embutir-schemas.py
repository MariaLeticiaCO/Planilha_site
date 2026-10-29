# Gera src/server/db/schema-sql.ts com os scripts de database/ embutidos (rode depois de editar um .sql):
#   python3 scripts/embutir-schemas.py
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
partes = ["""// Cópias dos scripts de database/ embutidas no código, para o app conseguir criar o banco
// sozinho na Vercel (onde os arquivos .sql não vão junto com as funções).
// Não edite à mão: gere com `python3 scripts/embutir-schemas.py`.
// O teste tests/schema.test.ts garante que são idênticas aos arquivos .sql.
"""]
for nome, arquivo in [("SCRIPT_POSTGRES", "postgres_schema.sql"), ("SCRIPT_SCHEMA", "controle_vendas_schema.sql")]:
    sql = (raiz / "database" / arquivo).read_text(encoding="utf-8")
    assert "`" not in sql and "${" not in sql and "\\" not in sql, arquivo
    partes.append(f"\n/** database/{arquivo} */\nexport const {nome} = `{sql}`;\n")
(raiz / "src/server/db/schema-sql.ts").write_text("".join(partes), encoding="utf-8")
print("schema-sql.ts atualizado")
