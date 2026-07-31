import type { ProductionScope } from "./types";
import {
  assertExpectedSingleMutation,
  assertPositiveRowVersion,
  assertProductionScope,
  requireStableId,
  requireTimestamp,
} from "./shared";

export type AtomicPhase8MutationPredicate = ProductionScope & {
  objectId: string;
  expectedRowVersion: number;
};

export type AtomicPhase8MutationCommand<T extends ProductionScope> = {
  where: AtomicPhase8MutationPredicate;
  next: T;
  actorIdentityId: string;
  occurredAt: string;
};

export interface SecureEvidenceLocationAdapter {
  readonly connected: false;
  verifyReference(input: {
    scope: ProductionScope;
    secureExternalReference: string;
    expectedDigest: string;
  }): Promise<{
    connected: false;
    result: "NOT_CONNECTED";
  }>;
}

export class DisconnectedSecureEvidenceLocationAdapter
  implements SecureEvidenceLocationAdapter
{
  readonly connected = false as const;

  async verifyReference() {
    return {
      connected: false as const,
      result: "NOT_CONNECTED" as const,
    };
  }
}

export interface Phase8PlanningRepository<T extends ProductionScope> {
  updateAtomic(command: AtomicPhase8MutationCommand<T>): Promise<{ count: number }>;
}

export function assertAtomicPhase8Mutation<T extends ProductionScope>(input: {
  command: AtomicPhase8MutationCommand<T>;
  authorizedScope: ProductionScope;
  result: { count: number };
}) {
  assertProductionScope(
    input.command.where,
    input.authorizedScope,
    "PHASE8_MUTATION_SCOPE_MISMATCH",
  );
  assertProductionScope(
    input.command.next,
    input.authorizedScope,
    "PHASE8_MUTATION_PAYLOAD_SCOPE_MISMATCH",
  );
  requireStableId(input.command.where.objectId, "PHASE8_MUTATION_ID_INVALID");
  requireStableId(
    input.command.actorIdentityId,
    "PHASE8_MUTATION_ACTOR_INVALID",
  );
  requireTimestamp(input.command.occurredAt, "PHASE8_MUTATION_TIMESTAMP_INVALID");
  assertPositiveRowVersion(input.command.where.expectedRowVersion);
  assertExpectedSingleMutation(input.result.count);
}
