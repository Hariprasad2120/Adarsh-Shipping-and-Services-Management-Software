const mssql = require('mssql');

const servers = [
  'localhost',
  'DESKTOP-J2P68VT',
  '192.168.1.130',
  '122.165.67.97',
  'DESKTOP-J2P68VT\\SQLEXPRESS',
  '192.168.1.130\\SQLEXPRESS',
  '122.165.67.97\\SQLEXPRESS',
  'localhost\\SQLEXPRESS'
];

async function testConnection(server) {
  const isNamed = server.includes('\\');
  const baseConfig = {
    server,
    database: 'eTimeTracklite1',
    user: 'sa',
    password: 'essl',
    connectionTimeout: 3000,
    requestTimeout: 3000,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };

  // If not a named instance, set port explicitly to 1433.
  if (!isNamed) {
    baseConfig.port = 1433;
  }

  console.log(`Testing: ${server} (port: ${baseConfig.port ?? 'dynamic'})...`);
  try {
    const pool = await mssql.connect(baseConfig);
    console.log(`✅ SUCCESS connecting to ${server}!`);
    const result = await pool.request().query("SELECT TOP 1 DeviceId, DeviceSName FROM Devices");
    console.log("Device sample:", result.recordset[0]);
    await pool.close();
    return true;
  } catch (err) {
    console.log(`❌ FAILED connecting to ${server}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("Starting eSSL Biometric connection test diagnostics...\n");
  for (const server of servers) {
    const ok = await testConnection(server);
    if (ok) {
      console.log(`\n🎉 Found working connection: ESSL_DB_SERVER="${server}"`);
    }
    console.log("-----------------------------------------");
  }
}

main();
