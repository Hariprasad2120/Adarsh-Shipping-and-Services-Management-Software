import "dotenv/config";
import { getEsslConfig, testEsslConnection } from "../src/lib/essl";

async function main() {
  console.log("Loading configuration from .env...");
  const config = getEsslConfig();
  console.log("Config built by getEsslConfig():", JSON.stringify(config, null, 2));
  
  if (!config) {
    console.error("❌ Failed to parse ESSL configuration from environment variables!");
    process.exit(1);
  }

  console.log("Testing connection via testEsslConnection helper...");
  const isConnected = await testEsslConnection(config);
  if (isConnected) {
    console.log("🎉 Connection successful! The biometric database is online.");
  } else {
    console.error("❌ Connection failed! Please check firewall/port settings.");
    process.exit(1);
  }
}

main();
