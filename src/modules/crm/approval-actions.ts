"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  submitForApproval,
  approveDocument,
  requestRework,
  declineDocument,
  sendToCustomer,
  markCustomerViewed,
  acceptQuote,
  markInvoiced,
  adminRestoreToDraft,
  recordCustomerDecision,
  createQuoteBooking,
  completeQuoteFreightProcess,
  completeQuoteChaProcess,
  getPendingApprovals,
  getApprovalLogs,
  getApprovalMetrics,
  convertToInvoice,
  raiseDirectSalesOrder,
} from "./approval-workflow";

async function getActorOrgId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { actorId: session.user.id, orgId: session.user.orgId ?? "" };
}

export async function actionSubmitForApproval(
  invoiceId: string,
  note?: string,
  managerId?: string,
) {
  const { actorId, orgId } = await getActorOrgId();
  await submitForApproval({ invoiceId, orgId, actorId, note, managerId });
}

export async function actionApproveDocument(invoiceId: string, note?: string) {
  const { actorId, orgId } = await getActorOrgId();
  await approveDocument({ invoiceId, orgId, actorId, note });
}

export async function actionRequestRework(invoiceId: string, note: string) {
  const { actorId, orgId } = await getActorOrgId();
  await requestRework({ invoiceId, orgId, actorId, note });
}

export async function actionDeclineDocument(invoiceId: string, note?: string) {
  const { actorId, orgId } = await getActorOrgId();
  await declineDocument({ invoiceId, orgId, actorId, note });
}

export async function actionSendToCustomer(invoiceId: string) {
  const { actorId, orgId } = await getActorOrgId();
  await sendToCustomer({ invoiceId, orgId, actorId });
}

export async function actionMarkCustomerViewed(invoiceId: string) {
  const { actorId, orgId } = await getActorOrgId();
  await markCustomerViewed({ invoiceId, orgId, actorId });
}

export async function actionAcceptQuote(invoiceId: string) {
  const { actorId, orgId } = await getActorOrgId();
  await acceptQuote({ invoiceId, orgId, actorId });
}

export async function actionMarkInvoiced(invoiceId: string) {
  const { actorId, orgId } = await getActorOrgId();
  await markInvoiced({ invoiceId, orgId, actorId });
}

export async function actionRecordCustomerDecision(
  invoiceId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string,
  actedAt?: string,
) {
  const { actorId, orgId } = await getActorOrgId();
  await recordCustomerDecision({ invoiceId, orgId, actorId, decision, note, actedAt });
}

export async function actionCreateQuoteBooking(invoiceId: string) {
  const { actorId, orgId } = await getActorOrgId();
  return createQuoteBooking({ invoiceId, orgId, actorId });
}

export async function actionCompleteQuoteFreightProcess(
  invoiceId: string,
  input: Parameters<typeof completeQuoteFreightProcess>[0]["input"],
) {
  const { actorId, orgId } = await getActorOrgId();
  return completeQuoteFreightProcess({ invoiceId, orgId, actorId, input });
}

export async function actionCompleteQuoteChaProcess(
  invoiceId: string,
  chaJobId: string,
  chaJobNumber: string,
) {
  const { actorId, orgId } = await getActorOrgId();
  return completeQuoteChaProcess({
    actorId,
    chaJobId,
    chaJobNumber,
    invoiceId,
    orgId,
  });
}

export async function actionAdminRestoreToDraft(invoiceId: string, note?: string) {
  const { actorId, orgId } = await getActorOrgId();
  await adminRestoreToDraft({ invoiceId, orgId, actorId, note });
}

export async function actionConvertToInvoice(salesOrderId: string) {
  const { actorId, orgId } = await getActorOrgId();
  const invoice = await convertToInvoice({ salesOrderId, orgId, actorId });
  return { id: invoice.id };
}

export async function actionRaiseDirectSalesOrder(invoiceId: string) {
  const { actorId, orgId } = await getActorOrgId();
  const salesOrder = await raiseDirectSalesOrder({ invoiceId, orgId, actorId });
  return { id: salesOrder.id };
}

export async function fetchPendingApprovals() {
  const { orgId } = await getActorOrgId();
  return getPendingApprovals(orgId);
}

export async function fetchApprovalLogs(invoiceId: string) {
  await getActorOrgId(); // auth check
  return getApprovalLogs(invoiceId);
}

export async function fetchApprovalMetrics() {
  const { orgId } = await getActorOrgId();
  return getApprovalMetrics(orgId);
}

