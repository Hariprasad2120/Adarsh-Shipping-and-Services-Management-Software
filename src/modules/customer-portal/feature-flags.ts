import fs from "fs/promises";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "public", "uploads", "customer-portal", "configs");

async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

export async function getPortalFeatureFlag(orgId: string, flag: "CUSTOMER_PORTAL_SHIPMENT_UPLOADS"): Promise<boolean> {
  try {
    await ensureConfigDir();
    const configPath = path.join(CONFIG_DIR, `${orgId}.json`);
    try {
      const data = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(data);
      if (config && typeof config[flag] === "boolean") {
        return config[flag];
      }
    } catch {
      // file doesn't exist yet
    }
  } catch (err) {
    console.error("Error reading portal feature flag:", err);
  }
  return true; // enabled by default
}

export async function setPortalFeatureFlag(orgId: string, flag: "CUSTOMER_PORTAL_SHIPMENT_UPLOADS", value: boolean): Promise<boolean> {
  try {
    await ensureConfigDir();
    const configPath = path.join(CONFIG_DIR, `${orgId}.json`);
    let config: Record<string, boolean> = {};
    try {
      const data = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(data);
    } catch {
      // file doesn't exist yet
    }
    config[flag] = value;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing portal feature flag:", err);
    return false;
  }
}
