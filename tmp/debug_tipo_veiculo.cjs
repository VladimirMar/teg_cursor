const { Pool } = require("pg");
const pool = new Pool();

(async () => {
  try {
    const q1 = await pool.query("SELECT codigo, crm, veiculo_placas FROM ordem_servico WHERE codigo = 3804");
    console.log("ordem_servico", q1.rows);

    const q2 = await pool.query(`
      SELECT codigo, crm, placas, tipo_de_bancada
      FROM veiculo
      WHERE (
        BTRIM(COALESCE(crm, '')) <> ''
        AND BTRIM(COALESCE(crm, '')) = (
          SELECT BTRIM(COALESCE(crm, ''))
          FROM ordem_servico
          WHERE codigo = 3804
        )
      ) OR (
        regexp_replace(UPPER(COALESCE(placas, '')), '[^A-Z0-9]', '', 'g') <> ''
        AND regexp_replace(UPPER(COALESCE(placas, '')), '[^A-Z0-9]', '', 'g') = (
          SELECT regexp_replace(UPPER(COALESCE(veiculo_placas, '')), '[^A-Z0-9]', '', 'g')
          FROM ordem_servico
          WHERE codigo = 3804
        )
      )
      ORDER BY codigo DESC
      LIMIT 10
    `);
    console.log("veiculo_matches", q2.rows);

    const q3 = await pool.query(`
      SELECT id, data_evento, crm, veiculo_placas, veiculo_tipo_de_bancada
      FROM ordem_servico_historico
      WHERE ordem_servico_codigo = 3804
      ORDER BY data_evento DESC, id DESC
      LIMIT 10
    `);
    console.log("historico", q3.rows);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
