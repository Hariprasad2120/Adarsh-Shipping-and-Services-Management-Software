"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { createCommunicationAuditLog } from "./communication-audit.service";

export async function listForms(userId: string, orgId: string) {
  await requirePermission(userId, "communication.forms.access");

  return db.form.findMany({
    where: { orgId },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createForm(
  userId: string,
  orgId: string,
  data: {
    title: string;
    description?: string;
    fields: {
      label: string;
      type: "TEXT" | "TEXTAREA" | "SELECT" | "CHECKBOX" | "RADIO" | "FILE";
      options?: string; // Comma separated for select/checkbox/radio
      required?: boolean;
    }[];
  }
) {
  await requirePermission(userId, "communication.forms.create");

  const form = await db.$transaction(async (tx) => {
    const form = await tx.form.create({
      data: {
        orgId,
        title: data.title,
        description: data.description,
        createdById: userId,
      },
    });

    if (data.fields && data.fields.length > 0) {
      await tx.formField.createMany({
        data: data.fields.map((f, idx) => ({
          orgId,
          formId: form.id,
          label: f.label,
          type: f.type,
          options: f.options,
          required: f.required ?? false,
          order: idx,
        })),
      });
    }

    return form;
  });

  await createCommunicationAuditLog(orgId, userId, "CREATE_CUSTOM_FORM", {
    formId: form.id,
    title: data.title,
  });

  return form;
}

export async function getFormWithFields(orgId: string, formId: string) {
  return db.form.findUniqueOrThrow({
    where: { id: formId, orgId },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function submitFormResponse(
  userId: string | null,
  orgId: string,
  formId: string,
  answers: Record<string, any>
) {
  const form = await db.form.findUniqueOrThrow({
    where: { id: formId, orgId, isActive: true },
  });

  return db.formResponse.create({
    data: {
      orgId,
      formId,
      userId,
      answers,
    },
  });
}

export async function listFormResponses(userId: string, orgId: string, formId: string) {
  await requirePermission(userId, "communication.forms.create");

  return db.formResponse.findMany({
    where: { formId, orgId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleFormStatus(userId: string, orgId: string, formId: string, isActive: boolean) {
  await requirePermission(userId, "communication.forms.create");

  const updated = await db.form.update({
    where: { id: formId, orgId },
    data: { isActive },
  });

  await createCommunicationAuditLog(orgId, userId, "TOGGLE_FORM_STATUS", { formId, isActive });
  return updated;
}
