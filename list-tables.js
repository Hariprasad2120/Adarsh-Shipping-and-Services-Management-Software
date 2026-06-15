const mssql = require('mssql');

const config = {
  server: '192.168.1.130',
  port: 1433,
  database: 'eTimeTracklite1',
  user: 'sa',
  password: 'essl',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function listTables() {
  try {
    const pool = await mssql.connect(config);
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE 'DeviceLogs%'
      ORDER BY TABLE_NAME
    `);
    console.log("Found DeviceLogs tables:");
    console.log(result.recordset.map(r => r.TABLE_NAME));
    await pool.close();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

listTables();
