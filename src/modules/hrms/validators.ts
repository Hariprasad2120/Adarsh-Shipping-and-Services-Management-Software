import { z } from "zod";

export const PunchSchema = z.object({
  action: z.enum(["CHECK_IN", "CHECK_OUT", "START_BREAK", "RESUME_WORK"]),
  source: z
    .enum(["WEB", "MOBILE", "BIOMETRIC", "MANUAL"])
    .optional()
    .default("WEB"),
  note: z.string().optional(),
  deviceId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const LeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  fromDate: z.string().transform((str) => new Date(str)),
  toDate: z.string().transform((str) => new Date(str)),
  reason: z.string().min(3, "Reason is required"),
  fromHalf: z.boolean().optional().default(false),
  toHalf: z.boolean().optional().default(false),
  attachmentIds: z.array(z.string()).optional(),
});

export const TimeLogSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  date: z.string().transform((str) => new Date(str)),
  hours: z.number().positive("Hours must be greater than 0"),
  isBillable: z.boolean().optional().default(true),
  description: z.string().optional(),
});

export const HRCaseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .optional()
    .default("MEDIUM"),
});

export const SurveyResponseSchema = z.object({
  answers: z.record(z.string(), z.any()),
});

export const HrmsTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  dueDate: z.string().transform((str) => new Date(str)),
  assigneeId: z.string().min(1, "Assignee is required"),
});

export const ServiceSettingsSchema = z.object({
  services: z.array(
    z.object({
      key: z.string(),
      enabled: z.boolean(),
      position: z.number(),
    }),
  ),
});

export const WorkReportItemSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  jobNoName: z.string().trim().min(1, "Job number/name is required").max(250),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(5000),
});

export const WorkReportCustomValueSchema = z.union([
  z.string().max(5000),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const WorkReportSchema = z
  .object({
    date: z.iso
      .date()
      .transform((str) => new Date(`${str}T00:00:00.000Z`)),
    workedOn: z.enum(["Office", "Home", "Others"]),
    items: z.array(WorkReportItemSchema).min(1).max(25).optional(),
    // Kept as an API compatibility path for older clients. New clients submit
    // `items`, and the service always persists a normalized item array.
    jobNoName: z.string().trim().max(250).optional(),
    description: z.string().trim().max(5000).optional(),
    customValues: z
      .record(z.string(), WorkReportCustomValueSchema)
      .optional()
      .default({}),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(100000).optional(),
      address: z.string().trim().min(1).max(1000),
    }),
  })
  .superRefine((value, context) => {
    if (value.items?.length) return;
    if (!value.jobNoName) {
      context.addIssue({
        code: "custom",
        path: ["jobNoName"],
        message: "Job number/name is required",
      });
    }
    if (!value.description || value.description.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["description"],
        message: "Description must be at least 5 characters",
      });
    }
  })
  .transform((value) => ({
    date: value.date,
    workedOn: value.workedOn,
    items: value.items ?? [
      {
        jobNoName: value.jobNoName!,
        description: value.description!,
      },
    ],
    customValues: value.customValues,
    location: value.location,
  }));

export const WorkReportApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().trim().max(2000).optional(),
});

export const WorkReportSettingsSchema = z.object({
  approvalLevels: z.union([z.literal(1), z.literal(2)]),
  requireApprovedReportForOt: z.boolean(),
});

export const WorkReportFieldTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "BOOLEAN",
]);

export const WorkReportFieldSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: WorkReportFieldTypeSchema.default("TEXT"),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  position: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});
