import { z } from "zod";

// Structured shape stored in LeavePolicyVersion.configuration (Json column).
// Every sub-shape is validated here rather than left freeform, per the
// architecture decision in docs/leave-management/ARCHITECTURE.md §3.

export const EntitlementTierSchema = z.object({
  minServiceMonths: z.number().int().min(0),
  maxServiceMonths: z.number().int().min(0).nullable(), // null = no upper bound
  amount: z.number().min(0),
});

export const EntitlementConfigSchema = z.discriminatedUnion("model", [
  z.object({
    model: z.literal("FIXED"),
    amount: z.number().min(0),
    creditFrequency: z.enum(["INSTANT", "MONTHLY", "QUARTERLY", "YEARLY"]),
  }),
  z.object({
    model: z.literal("EXPERIENCE_BASED"),
    tiers: z.array(EntitlementTierSchema).min(1),
    creditFrequency: z.enum(["MONTHLY", "YEARLY"]),
  }),
  z.object({
    model: z.literal("GRANT_BASED"),
    maxGrantsPerYear: z.number().int().min(0).nullable(),
    requiresApproval: z.boolean().default(true),
  }),
  z.object({
    model: z.literal("ATTENDANCE_BASED"),
    metric: z.enum(["PAYABLE_DAYS", "WORKED_DAYS", "PAYABLE_HOURS", "OVERTIME_HOURS"]),
    creditFrequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
    ratio: z.number().positive(), // units credited per metric unit worked
  }),
]);

export const ProrationConfigSchema = z.object({
  strategy: z.enum(["NONE", "START_OF_POLICY", "START_AND_END"]),
  rounding: z.enum(["NEAREST", "UP", "DOWN"]).default("NEAREST"),
});

export const ResetConfigSchema = z.object({
  cadence: z.enum(["CALENDAR_YEAR", "FINANCIAL_YEAR", "ANNIVERSARY", "MONTHLY", "NONE"]),
  financialYearStartMonth: z.number().int().min(1).max(12).optional(), // 1=Jan
});

export const CarryForwardConfigSchema = z.object({
  mode: z.enum(["NONE", "ALL", "FIXED_MAX", "PERCENTAGE"]),
  fixedMax: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  expiryAfterDays: z.number().int().min(0).nullable(),
});

export const EncashmentConfigSchema = z.object({
  mode: z.enum(["DISABLED", "EMPLOYEE_INITIATED", "AUTO_AT_RESET", "HR_INITIATED", "ON_EXIT"]),
  maxEncashableUnits: z.number().min(0).optional(),
  minBalanceRetained: z.number().min(0).default(0),
});

export const NegativeLeaveConfigSchema = z.object({
  mode: z.enum(["REJECT", "ALLOW_UNLIMITED", "ALLOW_WITHIN_LIMIT", "CONVERT_EXCESS_TO_LOP"]),
  limit: z.number().min(0).optional(), // used when mode = ALLOW_WITHIN_LIMIT
});

export const PartialPaySlabSchema = z.object({
  uptoUnits: z.number().positive(), // cumulative threshold, e.g. first 5 days
  payPercentage: z.number().min(0).max(100),
});

export const RestrictionConfigSchema = z.object({
  minUnitsPerRequest: z.number().min(0).optional(),
  maxUnitsPerRequest: z.number().min(0).optional(),
  maxConsecutiveUnits: z.number().min(0).optional(),
  maxOccurrencesPerYear: z.number().int().min(0).optional(),
  minNoticeDays: z.number().int().min(0).optional(),
  maxAdvanceBookingDays: z.number().int().min(0).optional(),
  allowPastDated: z.boolean().default(false),
  allowSameDay: z.boolean().default(true),
  allowDuringProbation: z.boolean().default(true),
  waitingPeriodAfterJoiningDays: z.number().int().min(0).default(0),
  minBalanceRequired: z.number().min(0).default(0),
  requireAttachment: z.enum(["NEVER", "ALWAYS", "ABOVE_THRESHOLD"]).default("NEVER"),
  attachmentThresholdUnits: z.number().min(0).optional(),
  requireReason: z.boolean().default(true),
});

export const SandwichConfigSchema = z.object({
  enabled: z.boolean().default(false),
  includeWeekends: z.boolean().default(true),
  includeHolidays: z.boolean().default(true),
  activationThresholdUnits: z.number().min(0).default(0), // only kicks in above this many requested units
});

export const ClubbingRuleSchema = z.object({
  otherLeaveTypeId: z.string(),
  mode: z.enum(["FORBID_COMBINE", "FORBID_ADJACENT", "REQUIRE_APPROVAL_IF_COMBINED"]),
});

export const ApprovalCriterionSchema = z.object({
  maxUnits: z.number().min(0).optional(), // route applies when requested units <= this
  minUnits: z.number().min(0).optional(),
  requiresLop: z.boolean().optional(),
});

export const ApprovalStepConfigSchema = z.object({
  sequence: z.number().int().min(1).max(10),
  approverType: z.enum([
    "MANAGER",
    "MANAGERS_MANAGER",
    "DEPARTMENT_HEAD",
    "ROLE",
    "NAMED_USER",
    "HR",
  ]),
  roleId: z.string().optional(), // when approverType = ROLE
  userId: z.string().optional(), // when approverType = NAMED_USER
});

export const ApprovalRouteSchema = z.object({
  criteria: ApprovalCriterionSchema,
  steps: z.array(ApprovalStepConfigSchema).min(1).max(10),
});

export const ApprovalRoutingConfigSchema = z.object({
  autoApprove: z.boolean().default(false),
  routes: z.array(ApprovalRouteSchema).default([]),
  mandatoryApprovalComment: z.boolean().default(false),
  mandatoryRejectionComment: z.boolean().default(true),
  slaHours: z.number().int().min(0).optional(),
});

export const LeavePolicyConfigSchema = z.object({
  entitlement: EntitlementConfigSchema,
  proration: ProrationConfigSchema,
  reset: ResetConfigSchema,
  carryForward: CarryForwardConfigSchema,
  encashment: EncashmentConfigSchema,
  negativeLeave: NegativeLeaveConfigSchema,
  maxBalance: z.number().min(0).nullable().default(null),
  effectiveAfterServiceMonths: z.number().int().min(0).default(0),
  partialPaySlabs: z.array(PartialPaySlabSchema).default([]),
  restrictions: RestrictionConfigSchema.default({
    allowPastDated: false,
    allowSameDay: true,
    allowDuringProbation: true,
    waitingPeriodAfterJoiningDays: 0,
    minBalanceRequired: 0,
    requireAttachment: "NEVER",
    requireReason: true,
  }),
  sandwich: SandwichConfigSchema.default({
    enabled: false,
    includeWeekends: true,
    includeHolidays: true,
    activationThresholdUnits: 0,
  }),
  clubbingRules: z.array(ClubbingRuleSchema).default([]),
  approvalRouting: ApprovalRoutingConfigSchema.default({
    autoApprove: false,
    routes: [],
    mandatoryApprovalComment: false,
    mandatoryRejectionComment: true,
  }),
  availabilityStatus: z.enum(["BUSY", "FREE", "OUT_OF_OFFICE"]).default("OUT_OF_OFFICE"),
});

export type LeavePolicyConfig = z.infer<typeof LeavePolicyConfigSchema>;
export type EntitlementConfig = z.infer<typeof EntitlementConfigSchema>;
export type ApprovalRoute = z.infer<typeof ApprovalRouteSchema>;
