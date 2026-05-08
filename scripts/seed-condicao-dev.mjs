import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDirectory, '..')
const seedFilePath = path.join(workspaceRoot, 'scripts', 'seed-condicao.sql')
const dryRun = process.argv.includes('--dry-run')

const connectionConfig = {
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
  database: process.env.PGDATABASE ?? 'teg_financ',
}

const pool = new Pool(connectionConfig)

async function main() {
  const sql = await readFile(seedFilePath, 'utf8')

  console.log(`Seed file: ${seedFilePath}`)
  console.log(`Database: ${connectionConfig.database}@${connectionConfig.host}:${connectionConfig.port}`)

  if (dryRun) {
    console.log('Dry run enabled. No SQL was executed.')
    return
  }

  const client = await pool.connect()

  try {
    await client.query(sql)

    const result = await client.query(`
      SELECT codigo, descricao, qtde_ini, qtde_fim
      FROM condicao
      ORDER BY codigo DESC
      LIMIT 16
    `)

    console.log(`Carga aplicada com sucesso. Registros retornados: ${result.rowCount ?? 0}`)
    console.table(result.rows)
  } finally {
    client.release()
  }
}

main()
  .catch((error) => {
    console.error('Falha ao aplicar a carga da tabela condicao.')
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })