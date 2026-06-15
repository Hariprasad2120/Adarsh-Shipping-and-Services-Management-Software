/**
 * Shared helpers for eSSL eTimetracklite SQL Server connectivity.
 * Used by biometric sync, live sync, and day-punches endpoints.
 */

import mssql from "mssql";

/** IST offset: eSSL stores LogDate as IST local time without timezone info.
 *  mssql/tedious reads it as UTC, so subtract 5.5 h to get actual UTC. */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function esslDateToUtc(d: Date): Date {
  return new Date(d.getTime() - IST_OFFSET_MS);
}

/** Build mssql config from .env ESSL_DB_* vars or ESSL_DATABASE_URL. */
export function getEsslConfig(): mssql.config | null {
  const url = process.env.ESSL_DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        server: decodeURIComponent(parsed.hostname),
        port: parsed.port ? parseInt(parsed.port) : 1433,
        database: parsed.pathname.replace(/^\//, ""),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
      };
    } catch { /* fall through */ }
  }
  const server = process.env.ESSL_DB_SERVER;
  const database = process.env.ESSL_DB_NAME;
  const user = process.env.ESSL_DB_USER;
  const password = process.env.ESSL_DB_PASSWORD;
  if (server && database && user) {
    const hasNamedInstance = server.includes("\\");
    const portEnv = process.env.ESSL_DB_PORT;
    return {
      server,
      port: hasNamedInstance && !portEnv ? undefined : parseInt(portEnv ?? "1433"),
      database,
      user,
      password: password ?? "",
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    };
  }
  return null;
}

/** DeviceLogs partition table name for a given month. */
export function punchTable(year: number, month: number): string {
  return `DeviceLogs_${month}_${year}`;
}

/**
 * Build a deviceId → "in"|"out" map from the Devices table.
 * Uses the last word of DeviceSName as the direction indicator.
 * e.g. "Back Office In" → "in", "Chennai Upstair Out" → "out"
 * "ME(Attendance)" / "Mobile" → not mapped; caller falls back to Direction field.
 */
export async function buildDeviceDirMap(
  pool: mssql.ConnectionPool
): Promise<Map<number, "in" | "out">> {
  const result = await pool
    .request()
    .query<{ DeviceId: number; DeviceSName: string | null; DeviceFName: string | null }>(
      "SELECT DeviceId, DeviceSName, DeviceFName FROM Devices"
    );
  const map = new Map<number, "in" | "out">();
  for (const dev of result.recordset) {
    const sName = String(dev.DeviceSName ?? "").trim().toLowerCase();
    const fName = String(dev.DeviceFName ?? "").trim().toLowerCase();
    
    if (/\bin\b/.test(sName) || /\bin\b/.test(fName)) {
      map.set(dev.DeviceId, "in");
    } else if (/\bout\b/.test(sName) || /\bout\b/.test(fName)) {
      map.set(dev.DeviceId, "out");
    }
  }
  return map;
}

/** Resolve direction: device name takes priority over the Direction field. */
export function resolveDirection(
  deviceId: number | null | undefined,
  directionField: string | null | undefined,
  deviceDirMap: Map<number, "in" | "out">
): string {
  if (deviceId != null) {
    const mapped = deviceDirMap.get(Number(deviceId));
    if (mapped) return mapped;
  }
  return String(directionField ?? "").trim().toLowerCase();
}

export interface RawPunch {
  time: Date;    // UTC
  dir: string;   // 'in' | 'out'
  deviceId: number;
  deviceName: string;
}

export interface PunchSession {
  in: string;          // ISO UTC
  out: string | null;  // ISO UTC or null (still inside)
  durationHours: number | null;
}

/** Pair raw punches into in/out sessions. */
export function pairPunches(punches: RawPunch[]): PunchSession[] {
  const sorted = [...punches].sort((a, b) => a.time.getTime() - b.time.getTime());
  const sessions: PunchSession[] = [];

  let i = 0;
  while (i < sorted.length) {
    const punch = sorted[i]!;
    if (punch.dir === "in") {
      // Find the next 'out' punch
      let j = i + 1;
      while (j < sorted.length && sorted[j]!.dir !== "out") j++;
      const outPunch = sorted[j]?.dir === "out" ? sorted[j]! : null;
      const durationHours = outPunch
        ? (outPunch.time.getTime() - punch.time.getTime()) / (1000 * 60 * 60)
        : null;
      sessions.push({
        in: punch.time.toISOString(),
        out: outPunch?.time.toISOString() ?? null,
        durationHours: durationHours !== null ? Math.round(durationHours * 100) / 100 : null,
      });
      i = outPunch ? j + 1 : i + 1;
    } else {
      // Orphan 'out' punch (no matching 'in') — skip
      i++;
    }
  }
  return sessions;
}
