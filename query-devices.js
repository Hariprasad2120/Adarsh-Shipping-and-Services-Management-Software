const mssql = require('mssql');

const config = {
  server: '192.168.1.130',
  port: 1433,
  database: 'eTimeTracklite1',
  user: 'sa',
  password: 'essl',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function queryDevices() {
  try {
    const pool = await mssql.connect(config);
    const result = await pool.request().query("SELECT DeviceId, DeviceSName, DeviceFName FROM Devices");
    console.log("Devices table:");
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

queryDevices();
