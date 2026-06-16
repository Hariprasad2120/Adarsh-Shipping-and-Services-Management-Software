import { z } from "zod";

export const PunchSchema = z.object({
  action: z.enum(["CHECK_IN", "CHECK_OUT", "START_BREAK", "RESUME_WORK"]),
  source: z.enum(["WEB", "MOBILE", "BIOMETRIC", "MANUAL"]).optional().default("WEB"),
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
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
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
    })
  ),
});

export const WorkReportSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  workedOn: z.enum(["Office", "Home", "Others"]),
  jobNoName: z.string().min(1, "Job number/name is required"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  addedAddress: z.string().optional(),
});

export const WorkReportApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().optional(),
});

