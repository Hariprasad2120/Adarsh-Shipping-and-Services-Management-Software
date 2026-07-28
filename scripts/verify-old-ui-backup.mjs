import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-foundation-7120d79.zip",
);
const expectedHash = "7271B78353937BDD0BF733E3AA864FFEFCFD05C444172318C3B5D5B71401E043";
const expectedSize = 1_598_247;
const requiredEntries = [
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/dashboard/portal-client.tsx",
  "src/components/monolith/monolith-dashboard-shell.tsx",
  "src/styles/monolith-system.css",
];

if (!existsSync(archivePath)) {
  throw new Error(`Missing backup archive: ${archivePath}`);
}

if (statSync(archivePath).size !== expectedSize) {
  throw new Error(`Backup size mismatch for ${archivePath}`);
}

const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) {
  hash.update(chunk);
}

const actualHash = hash.digest("hex").toUpperCase();
if (actualHash !== expectedHash) {
  throw new Error(`Backup checksum mismatch: expected ${expectedHash}, received ${actualHash}`);
}

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});

if (listing.status !== 0) {
  throw new Error(listing.stderr || "Unable to list backup archive");
}

const entries = new Set(listing.stdout.split(/\r?\n/).filter(Boolean));
for (const requiredEntry of requiredEntries) {
  if (!entries.has(requiredEntry)) {
    throw new Error(`Backup is missing required entry: ${requiredEntry}`);
  }
}

console.log(
  `Verified OLD UI backup: ${entries.size} entries, ${expectedSize} bytes, SHA-256 ${expectedHash}`,
);
