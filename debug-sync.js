const mssql = require('mssql');

const config = {
  server: '192.168.1.130',
  port: 1433,
  database: 'eTimeTracklite1',
  user: 'sa',
  password: 'essl',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function debug() {
  const year = 2026;
  const month = 6;
  const paddedStart = new Date(year, month - 1, 1);
  const paddedEnd = new Date(year, month, 1);

  console.log("start:", paddedStart.toISOString(), "local:", paddedStart.toString());
  console.log("end:", paddedEnd.toISOString(), "local:", paddedEnd.toString());

  try {
    const pool = await mssql.connect(config);
    const result = await pool.request()
      .input("start", mssql.DateTime, paddedStart)
      .input("end", mssql.DateTime, paddedEnd)
      .query(`
        SELECT COUNT(*) AS cnt
        FROM DeviceLogs_6_2026
        WHERE LogDate >= @start AND LogDate < @end
      `);
    console.log("Punches count:", result.recordset[0].cnt);

    const sample = await pool.request()
      .input("start", mssql.DateTime, paddedStart)
      .input("end", mssql.DateTime, paddedEnd)
      .query(`
        SELECT TOP 5 UserId, LogDate, Direction, DeviceId
        FROM DeviceLogs_6_2026
        WHERE LogDate >= @start AND LogDate < @end
      `);
    console.log("Sample punches:", sample.recordset);

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

debug();
