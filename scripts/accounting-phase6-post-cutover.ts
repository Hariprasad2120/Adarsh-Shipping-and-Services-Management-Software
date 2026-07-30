import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  verifyPostCutoverSnapshot,
  type PostCutoverSnapshot,
} from "../src/modules/accounting/migration/post-cutover";
import {
  assertNoSensitiveFields,
  boundedSafeMessage,
} from "../src/modules/accounting/migration/security";

function main() {
  const index = process.argv.indexOf("--snapshot");
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error("POST_CUTOVER_SNAPSHOT_REQUIRED");
  const path = resolve(value);
  if (!existsSync(path)) throw new Error("POST_CUTOVER_SNAPSHOT_NOT_FOUND");
  const source = readFileSync(path);
  if (source.length === 0 || source.length > 1024 * 1024) {
    throw new Error("POST_CUTOVER_SNAPSHOT_SIZE_INVALID");
  }
  const snapshotValue: unknown = JSON.parse(source.toString("utf8"));
  assertNoSensitiveFields(snapshotValue);
  const snapshot = snapshotValue as PostCutoverSnapshot;
  const result = verifyPostCutoverSnapshot(snapshot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ready ? 0 : 2;
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({ status: "FAILED", error: boundedSafeMessage(error) })}\n`,
  );
  process.exitCode = 1;
}
