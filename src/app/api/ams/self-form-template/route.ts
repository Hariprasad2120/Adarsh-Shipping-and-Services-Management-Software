import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getSelfFormTemplate, saveSelfFormTemplate } from "@/modules/ams/service";
import { normalizeSelfFormTemplate } from "@/modules/ams/self-form-template";
import { z } from "zod";

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  type: z.enum(["text", "textarea", "radio", "number"]),
  options: z.array(optionSchema).optional(),
  allowExplanation: z.boolean().optional(),
  placeholder: z.string().optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema),
});

const employeeFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "date", "radio"]),
  options: z.array(optionSchema).optional(),
  placeholder: z.string().optional(),
  showWhen: z.object({
    fieldId: z.string().min(1),
    equals: z.string().min(1),
  }).optional(),
});

const templateSchema = z.object({
  employeeInfoFields: z.array(employeeFieldSchema),
  partASections: z.array(sectionSchema),
  selfRating: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  }),
});

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.criteria.manage");

  return ok(await getSelfFormTemplate(session!.user.orgId!));
}

export async function PUT(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.criteria.manage");

  const parsed = templateSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const normalized = normalizeSelfFormTemplate(parsed.data);
  await saveSelfFormTemplate(session!.user.orgId!, normalized);
  return ok({ saved: true, template: normalized });
}
