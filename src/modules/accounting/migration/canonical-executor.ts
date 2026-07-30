import "server-only";

import {
  prepareLegacyCustomerNote,
  prepareLegacyPayment,
  prepareLegacyPurchaseInvoice,
  prepareLegacySalesInvoice,
  prepareLegacyVendorNote,
} from "../document-adapters";
import { db } from "@/lib/db";
import type {
  CanonicalMigrationExecutor,
  NormalizedMigrationRecord,
} from "./types";

function legacyId(record: NormalizedMigrationRecord) {
  const value = record.payload.legacyRecordId;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("CANONICAL_SERVICE_LEGACY_RECORD_REQUIRED");
  }
  return value.trim();
}

export function assertCanonicalMigrationRecordScope(input: {
  authorizedOrgId: string;
  authorizedLegalEntityId: string;
  mappedOrganizationId: string;
  mappedLegalEntityId: string;
}) {
  if (!input.authorizedOrgId.trim()) {
    throw new Error("SCOPE_VIOLATION:ORGANIZATION_REQUIRED");
  }
  if (!input.authorizedLegalEntityId.trim()) {
    throw new Error("SCOPE_VIOLATION:LEGAL_ENTITY_REQUIRED");
  }
  if (input.mappedOrganizationId !== input.authorizedOrgId) {
    throw new Error("SCOPE_VIOLATION:ORGANIZATION");
  }
  if (input.mappedLegalEntityId !== input.authorizedLegalEntityId) {
    throw new Error("SCOPE_VIOLATION:LEGAL_ENTITY");
  }
}

export function createCanonicalMigrationExecutor(input: {
  orgId: string;
  legalEntityId: string;
  actorId: string;
}): CanonicalMigrationExecutor {
  if (!input.orgId.trim() || !input.legalEntityId.trim()) {
    throw new Error("SCOPE_VIOLATION:EXECUTION_SCOPE_REQUIRED");
  }
  let verifiedScope: Promise<void> | undefined;
  const verifyDatabaseScope = () => {
    verifiedScope ??= db.accountingLegalEntity
      .findFirst({
        where: {
          id: input.legalEntityId,
          orgId: input.orgId,
          status: "ACTIVE",
        },
        select: { id: true },
      })
      .then((legalEntity) => {
        if (!legalEntity) {
          throw new Error("SCOPE_VIOLATION:LEGAL_ENTITY_NOT_IN_ORGANIZATION");
        }
      });
    return verifiedScope;
  };
  const assertTargetScope = (target: {
    orgId: string;
    legalEntityId: string;
  }) => {
    if (
      target.orgId !== input.orgId ||
      target.legalEntityId !== input.legalEntityId
    ) {
      throw new Error("SCOPE_VIOLATION:CANONICAL_TARGET");
    }
  };
  return {
    async execute(record) {
      assertCanonicalMigrationRecordScope({
        authorizedOrgId: input.orgId,
        authorizedLegalEntityId: input.legalEntityId,
        mappedOrganizationId: record.mappedOrganizationId,
        mappedLegalEntityId: record.mappedLegalEntityId,
      });
      await verifyDatabaseScope();
      if (record.attachments.length) {
        throw new Error("ATTACHMENT_FAILURE:SCAN_REQUIRED");
      }
      if (record.sourceRecordType === "SALES_INVOICE") {
        const target = await prepareLegacySalesInvoice({
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          invoiceId: legacyId(record),
          makerId: input.actorId,
        });
        assertTargetScope(target);
        return {
          canonicalTargetIdentifier: target.id,
          currencyCode: target.transactionCurrencyCode,
          documentTotal: String(target.totalAmount),
          debitTotal: String(target.totalAmount),
          creditTotal: String(target.totalAmount),
          outboxItemsCreated: 0,
        };
      }
      if (record.sourceRecordType === "PURCHASE_INVOICE") {
        const target = await prepareLegacyPurchaseInvoice({
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          invoiceId: legacyId(record),
          makerId: input.actorId,
        });
        assertTargetScope(target);
        return {
          canonicalTargetIdentifier: target.id,
          currencyCode: target.transactionCurrencyCode,
          documentTotal: String(target.totalAmount),
          debitTotal: String(target.totalAmount),
          creditTotal: String(target.totalAmount),
          outboxItemsCreated: 0,
        };
      }
      if (
        record.sourceRecordType === "RECEIPT" ||
        record.sourceRecordType === "PAYMENT"
      ) {
        const target = await prepareLegacyPayment({
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          paymentEntryId: legacyId(record),
          makerId: input.actorId,
        });
        assertTargetScope(target);
        return {
          canonicalTargetIdentifier: target.id,
          currencyCode: target.transactionCurrencyCode,
          receiptPaymentTotal: String(target.amount),
          allocatedTotal: String(target.allocatedAmount),
          unallocatedTotal: String(target.unappliedAmount),
          debitTotal: String(target.amount),
          creditTotal: String(target.amount),
          outboxItemsCreated: 0,
        };
      }
      if (
        record.sourceRecordType === "CREDIT_NOTE" ||
        record.sourceRecordType === "DEBIT_NOTE"
      ) {
        const partyType = record.payload.partyType;
        if (partyType === "CUSTOMER") {
          const target = await prepareLegacyCustomerNote({
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            noteId: legacyId(record),
            makerId: input.actorId,
          });
          assertTargetScope(target);
          return {
            canonicalTargetIdentifier: target.id,
            currencyCode: target.transactionCurrencyCode,
            documentTotal: String(target.totalAmount),
            debitTotal: String(target.totalAmount),
            creditTotal: String(target.totalAmount),
            outboxItemsCreated: 0,
          };
        }
        if (partyType === "SUPPLIER") {
          const target = await prepareLegacyVendorNote({
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            noteId: legacyId(record),
            makerId: input.actorId,
          });
          assertTargetScope(target);
          return {
            canonicalTargetIdentifier: target.id,
            currencyCode: target.transactionCurrencyCode,
            documentTotal: String(target.totalAmount),
            debitTotal: String(target.totalAmount),
            creditTotal: String(target.totalAmount),
            outboxItemsCreated: 0,
          };
        }
        throw new Error("DOMAIN_VALIDATION:NOTE_PARTY_TYPE_REQUIRED");
      }
      throw new Error(
        `CANONICAL_SERVICE_UNAVAILABLE:${record.sourceRecordType}`,
      );
    },
  };
}
