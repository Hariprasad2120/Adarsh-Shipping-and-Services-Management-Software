import { z } from "zod";

export const IncentiveCreateSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  incentiveType: z.string().trim().min(2, "Incentive type is required").max(80),
  referenceLabel: z
    .string()
    .trim()
    .min(3, "Reference is required")
    .max(160),
  customerName: z.string().trim().max(160).optional().or(z.literal("")),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().trim().min(1).max(8).default("INR"),
  eligibleDate: z.string().min(1).transform((value) => new Date(value)),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const IncentiveUpdateSchema = z.object({
  status: z.enum(["REVIEWED", "APPROVED", "REJECTED", "PAID"]),
  hrNotes: z.string().trim().max(4000).optional().or(z.literal("")),
});
