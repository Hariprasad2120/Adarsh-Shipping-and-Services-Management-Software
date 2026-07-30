import type { NormalizedMigrationRecord } from "./types";

const TYPE_PRIORITY: Record<NormalizedMigrationRecord["sourceRecordType"], number> = {
  ORGANIZATION: 10,
  LEGAL_ENTITY: 20,
  CURRENCY: 30,
  ACCOUNTING_PERIOD: 40,
  ACCOUNT: 50,
  CUSTOMER: 60,
  SUPPLIER: 60,
  EXCHANGE_RATE_REFERENCE: 70,
  OPENING_BALANCE: 80,
  SALES_INVOICE: 90,
  PURCHASE_INVOICE: 90,
  RECURRING_TEMPLATE: 90,
  DEPRECIATION_SOURCE: 90,
  PARTNER_TRANSACTION: 90,
  CREDIT_NOTE: 100,
  DEBIT_NOTE: 100,
  RECEIPT: 110,
  PAYMENT: 110,
  JOURNAL_REFERENCE: 120,
  ALLOCATION: 130,
  ATTACHMENT: 140,
};

export function deterministicDependencyOrder(
  records: readonly NormalizedMigrationRecord[],
) {
  const byKey = new Map(records.map((record) => [record.deterministicKey, record]));
  const bySource = new Map(
    records.map((record) => [
      `${record.sourceSystem}:${record.sourceRecordType}:${record.sourceIdentifier}:${record.normalizedSourceVersion}`,
      record,
    ]),
  );
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  records.forEach((record) => incoming.set(record.deterministicKey, 0));

  for (const record of records) {
    for (const dependency of record.dependencies) {
      const target = byKey.get(dependency) ?? bySource.get(dependency);
      if (!target) {
        throw new Error(
          `MISSING_DEPENDENCY:${record.deterministicKey}:${dependency}`,
        );
      }
      outgoing.set(target.deterministicKey, [
        ...(outgoing.get(target.deterministicKey) ?? []),
        record.deterministicKey,
      ]);
      incoming.set(
        record.deterministicKey,
        (incoming.get(record.deterministicKey) ?? 0) + 1,
      );
    }
  }

  const compareKeys = (left: string, right: string) => {
    const leftRecord = byKey.get(left)!;
    const rightRecord = byKey.get(right)!;
    return (
      TYPE_PRIORITY[leftRecord.sourceRecordType] -
        TYPE_PRIORITY[rightRecord.sourceRecordType] ||
      leftRecord.sourceIdentifier.localeCompare(rightRecord.sourceIdentifier) ||
      left.localeCompare(right)
    );
  };
  const ready = [...incoming.entries()]
    .filter(([, count]) => count === 0)
    .map(([key]) => key)
    .sort(compareKeys);
  const ordered: NormalizedMigrationRecord[] = [];
  while (ready.length) {
    const key = ready.shift()!;
    ordered.push(byKey.get(key)!);
    for (const next of (outgoing.get(key) ?? []).sort(compareKeys)) {
      const remaining = (incoming.get(next) ?? 0) - 1;
      incoming.set(next, remaining);
      if (remaining === 0) {
        ready.push(next);
        ready.sort(compareKeys);
      }
    }
  }
  if (ordered.length !== records.length) {
    const cycle = [...incoming.entries()]
      .filter(([, count]) => count > 0)
      .map(([key]) => key)
      .sort();
    throw new Error(`DEPENDENCY_CYCLE:${cycle.join(",")}`);
  }
  return ordered;
}
