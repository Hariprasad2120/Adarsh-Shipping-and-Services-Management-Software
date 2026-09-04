"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  CircleUserRound,
  ContactRound,
  GraduationCap,
  HeartHandshake,
  IdCard,
  Landmark,
  MailCheck,
  Network,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "@/modules/notifications/client";
import { useCan } from "@/lib/caps-context";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import {
  PeopleControlButton as MnxAction,
  PeopleControlTable,
  PeopleControlTextarea,
} from "@/modules/people/components/people-controls";

type PayrollMeta = {
  employeeNumber?: string;
  monthlyGross?: number | null;
  breakup?: Record<string, number>;
  latestSalaryRevision?: Record<string, string | number | null> | null;
  salaryDetails?: Record<string, string | number | null> | null;
  bankDetails?: {
    holderName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    accountType?: string | null;
    paymentMode?: string | null;
    stateCode?: string | null;
  };
  personalDetails?: {
    gender?: string | null;
    personalEmail?: string | null;
    fatherName?: string | null;
    mobileNumber?: string | null;
    dateOfBirth?: string | null;
    panNumber?: string | null;
    maritalStatus?: string | null;
    aadhaar?: string | null;
  };
  workLocation?: Address;
  personalAddress?: Address;
  statutory?: {
    ["UAN Number"]?: string | null;
    parsed?: { uanNumber?: string | null };
  } | null;
  rawSheets?: {
    employee?: {
      ["First Name"]?: string | null;
      ["Last Name"]?: string | null;
      ["Employee Status"]?: string | null;
      ["Date of Joining"]?: string | null;
      ["Date of Birth"]?: string | null;
    } | null;
  };
};

type Address = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateCode?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type RepeatableRow = { id: string };
type EducationRow = RepeatableRow & {
  instituteName: string;
  degree: string;
  specialization: string;
  completionDate: string;
};
type ExperienceRow = RepeatableRow & {
  companyName: string;
  jobTitle: string;
  fromDate: string;
  toDate: string;
  jobDescription: string;
  relevant: boolean;
};
type DependentRow = RepeatableRow & {
  name: string;
  relationship: string;
  dateOfBirth: string;
};

type ProfileData = {
  nickname?: string;
  fatherName?: string;
  businessUnit?: string;
  location?: string;
  streams?: string;
  externalRole?: string;
  sourceOfHire?: string;
  aboutMe?: string;
  bloodGroup?: string;
  weddingDay?: string;
  maritalStatus?: string;
  expertise?: string;
  workPhone?: string;
  extension?: string;
  seatingLocation?: string;
  tags?: string;
  personalEmail?: string;
  presentAddress?: string;
  presentStateCode?: string;
  permanentAddress?: string;
  bankHolderName?: string;
  paymentMode?: string;
  oldAccountNumber?: string;
  accountType?: string;
  onboardingStatus?: string;
  education?: EducationRow[];
  workExperience?: ExperienceRow[];
  dependents?: DependentRow[];
};

type User = {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  employeeNumber: number | null;
  firstName: string | null;
  lastName: string | null;
  dob: string | Date | null;
  gender: string | null;
  employmentType: string | null;
  personalPhone: string | null;
  aadhaar: string | null;
  pan: string | null;
  uan: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  designation: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  activatedAt: string | Date | null;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
  tl: { id: string; name: string; email: string } | null;
  reports: { id: string; name: string; designation: string | null }[];
  tlReports: { id: string; name: string; designation: string | null }[];
  roles: { role: { id: string; name: string } }[];
  employmentRecord: {
    joinDate: string | Date;
    exitDate: string | Date | null;
    grade: string | null;
    ctc: number | null;
    basic: number | null;
    hra: number | null;
    conveyance: number | null;
    transport: number | null;
    travelling: number | null;
    fixedAllowance: number | null;
    stipend: number | null;
    priorExperienceYears: number | null;
    payrollMeta?: PayrollMeta | null;
  } | null;
  employeeProfile: {
    data: ProfileData;
    customValues: Record<string, string | number | boolean | null> | null;
    createdById: string | null;
    modifiedById: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  } | null;
  employeeInvitations: {
    id: string;
    expiresAt: string | Date;
    consumedAt: string | Date | null;
    revokedAt: string | Date | null;
    sentAt: string | Date | null;
    deliveryStatus: string;
    deliveryError: string | null;
    createdAt: string | Date;
  }[];
};

type OrgData = {
  branches: { id: string; name: string }[];
  departments: {
    id: string;
    name: string;
    divisions: { id: string; name: string }[];
  }[];
} | null;

type StubUser = { id: string; name: string; email: string };

type CustomField = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN";
  section: string;
  required: boolean;
  options: unknown;
  position: number;
};

type FormState = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
  nickname: string;
  fatherName: string;
  businessUnit: string;
  branchId: string;
  departmentId: string;
  divisionId: string;
  location: string;
  designation: string;
  streams: string;
  externalRole: string;
  employmentType: string;
  active: string;
  sourceOfHire: string;
  joinDate: string;
  managerId: string;
  tlId: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  aboutMe: string;
  bloodGroup: string;
  weddingDay: string;
  expertise: string;
  aadhaar: string;
  pan: string;
  uan: string;
  workPhone: string;
  extension: string;
  seatingLocation: string;
  tags: string;
  personalPhone: string;
  personalEmail: string;
  presentAddress: string;
  presentStateCode: string;
  permanentAddress: string;
  exitDate: string;
  onboardingStatus: string;
  grade: string;
  ctc: string;
  basic: string;
  hra: string;
  conveyance: string;
  transport: string;
  travelling: string;
  fixedAllowance: string;
  stipend: string;
  priorExperienceYears: string;
  bankHolderName: string;
  paymentMode: string;
  bankName: string;
  oldAccountNumber: string;
  ifsc: string;
  accountType: string;
  bankAccount: string;
  education: EducationRow[];
  workExperience: ExperienceRow[];
  dependents: DependentRow[];
  customValues: Record<string, string | number | boolean | null>;
};

function dateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return typeof value === "string" ? value.slice(0, 10) : "";
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN");
}

function display(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || String(value).trim() === "")
    return "—";
  return String(value);
}

function apiErrorMessage(result: unknown, fallback: string) {
  if (!result || typeof result !== "object") return fallback;
  const error = (result as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function formatAddress(address?: Address) {
  if (!address) return "";
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.stateCode,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function payrollNumber(
  meta: PayrollMeta | null,
  key: string,
  fallbackKey?: string,
) {
  for (const source of [
    meta?.breakup,
    meta?.latestSalaryRevision,
    meta?.salaryDetails,
  ]) {
    const value = source?.[key] ?? (fallbackKey ? source?.[fallbackKey] : null);
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/,/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function storedOrImported(
  stored: number | null | undefined,
  imported: number | null,
) {
  if (stored !== null && stored !== undefined && stored !== 0) return stored;
  return imported ?? stored ?? "";
}

function durationFrom(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "—";
  const start = new Date(dateValue);
  if (Number.isNaN(start.getTime())) return "—";
  const end = new Date();
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  return [years ? `${years} year${years === 1 ? "" : "s"}` : "", remaining ? `${remaining} month${remaining === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(" ") || "0 months";
}

function ageFrom(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "—";
  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${Math.max(0, years)} year(s) ${Math.max(0, months)} month(s)`;
}

function initialForm(user: User): FormState {
  const meta = user.employmentRecord?.payrollMeta ?? null;
  const profile = user.employeeProfile?.data ?? {};
  const rawEmployee = meta?.rawSheets?.employee;
  return {
    employeeNumber: String(user.employeeNumber ?? meta?.employeeNumber ?? ""),
    firstName:
      user.firstName ??
      rawEmployee?.["First Name"] ??
      user.name.split(" ")[0] ??
      "",
    lastName:
      user.lastName ??
      rawEmployee?.["Last Name"] ??
      user.name.split(" ").slice(1).join(" "),
    email: user.email,
    photo: user.photo ?? "",
    nickname: profile.nickname ?? "",
    fatherName:
      profile.fatherName ?? meta?.personalDetails?.fatherName ?? "",
    businessUnit: profile.businessUnit ?? user.branch?.name ?? "",
    branchId: user.branch?.id ?? "",
    departmentId: user.department?.id ?? "",
    divisionId: user.division?.id ?? "",
    location: profile.location ?? user.branch?.name ?? "",
    designation: user.designation ?? "",
    streams: profile.streams ?? "",
    externalRole: profile.externalRole ?? "",
    employmentType: user.employmentType ?? "",
    active: user.active ? "ACTIVE" : "INACTIVE",
    sourceOfHire: profile.sourceOfHire ?? "",
    joinDate: dateInput(
      user.employmentRecord?.joinDate ?? rawEmployee?.["Date of Joining"],
    ),
    managerId: user.manager?.id ?? "",
    tlId: user.tl?.id ?? "",
    dob: dateInput(
      user.dob ??
        meta?.personalDetails?.dateOfBirth ??
        rawEmployee?.["Date of Birth"],
    ),
    gender: user.gender ?? meta?.personalDetails?.gender ?? "",
    maritalStatus:
      profile.maritalStatus ?? meta?.personalDetails?.maritalStatus ?? "",
    aboutMe: profile.aboutMe ?? "",
    bloodGroup: profile.bloodGroup ?? "",
    weddingDay: dateInput(profile.weddingDay),
    expertise: profile.expertise ?? "",
    aadhaar: user.aadhaar ?? meta?.personalDetails?.aadhaar ?? "",
    pan: user.pan ?? meta?.personalDetails?.panNumber ?? "",
    uan:
      user.uan ??
      meta?.statutory?.parsed?.uanNumber ??
      meta?.statutory?.["UAN Number"] ??
      "",
    workPhone: profile.workPhone ?? "",
    extension: profile.extension ?? "",
    seatingLocation: profile.seatingLocation ?? "",
    tags: profile.tags ?? "",
    personalPhone:
      user.personalPhone ?? meta?.personalDetails?.mobileNumber ?? "",
    personalEmail:
      profile.personalEmail ?? meta?.personalDetails?.personalEmail ?? "",
    presentAddress:
      profile.presentAddress ?? formatAddress(meta?.personalAddress),
    presentStateCode:
      profile.presentStateCode ?? meta?.personalAddress?.stateCode ?? "",
    permanentAddress:
      profile.permanentAddress ?? formatAddress(meta?.workLocation),
    exitDate: dateInput(user.employmentRecord?.exitDate),
    onboardingStatus: profile.onboardingStatus ?? "",
    grade: user.employmentRecord?.grade ?? "",
    ctc: String(user.employmentRecord?.ctc ?? ""),
    basic: String(
      storedOrImported(
        user.employmentRecord?.basic,
        payrollNumber(meta, "Basic"),
      ),
    ),
    hra: String(
      storedOrImported(
        user.employmentRecord?.hra,
        payrollNumber(meta, "House Rent Allowance", "hra"),
      ),
    ),
    conveyance: String(
      storedOrImported(
        user.employmentRecord?.conveyance,
        payrollNumber(meta, "Conveyance Allowance"),
      ),
    ),
    transport: String(
      storedOrImported(
        user.employmentRecord?.transport,
        payrollNumber(meta, "Transport Allowance"),
      ),
    ),
    travelling: String(
      storedOrImported(
        user.employmentRecord?.travelling,
        payrollNumber(meta, "Travelling Allowance"),
      ),
    ),
    fixedAllowance: String(
      storedOrImported(
        user.employmentRecord?.fixedAllowance,
        payrollNumber(meta, "Fixed Allowance", "specialAllowance"),
      ),
    ),
    stipend: String(
      storedOrImported(
        user.employmentRecord?.stipend,
        payrollNumber(meta, "Stipend", "monthlyIncentive"),
      ),
    ),
    priorExperienceYears: String(
      user.employmentRecord?.priorExperienceYears ?? 0,
    ),
    bankHolderName:
      profile.bankHolderName ?? meta?.bankDetails?.holderName ?? "",
    paymentMode: profile.paymentMode ?? meta?.bankDetails?.paymentMode ?? "",
    bankName: user.bankName ?? meta?.bankDetails?.bankName ?? "",
    oldAccountNumber: profile.oldAccountNumber ?? "",
    ifsc: user.ifsc ?? meta?.bankDetails?.ifscCode ?? "",
    accountType: profile.accountType ?? meta?.bankDetails?.accountType ?? "",
    bankAccount:
      user.bankAccount ?? meta?.bankDetails?.accountNumber ?? "",
    education: profile.education ?? [],
    workExperience: profile.workExperience ?? [],
    dependents: profile.dependents ?? [],
    customValues: user.employeeProfile?.customValues ?? {},
  };
}

export function EmployeeProfile({
  user,
  roles,
  org,
  currentUserId,
  allUsers,
  customFields,
}: {
  user: User;
  roles: { id: string; name: string }[];
  org: OrgData;
  currentUserId: string;
  allUsers: StubUser[];
  customFields: CustomField[];
}) {
  const router = useRouter();
  const canEditAll = useCan("hrms.employee.edit");
  const canInvite = useCan("hrms.employee.create");
  const isSelf = user.id === currentUserId;
  const canEdit = canEditAll || isSelf;
  const canEditRoles = useCan("admin.roles.manage");
  const canDeactivate =
    useCan("hrms.employee.deactivate") &&
    user.id !== currentUserId &&
    (user.active ||
      user.employeeInvitations.length === 0 ||
      Boolean(user.activatedAt));
  const canResetPassword = useCan("admin.users.manage");
  const [editing, setEditing] = useState(false);
  const hrEditing = editing && canEditAll;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(user));
  const [editRoles, setEditRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(
    user.roles.map((role) => role.role.id),
  );
  const [showPwReset, setShowPwReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resendingInvitation, setResendingInvitation] = useState(false);
  const [profileLoadedAt] = useState(() => Date.now());
  const latestInvitation = user.employeeInvitations[0];

  const activeDivisions =
    org?.departments.find(
      (department) => department.id === form.departmentId,
    )?.divisions ?? [];
  const otherUsers = allUsers.filter((candidate) => candidate.id !== user.id);
  const actorNames = new Map(allUsers.map((candidate) => [candidate.id, candidate.name]));

  const customSections = useMemo(() => {
    const sections = new Map<string, CustomField[]>();
    for (const field of customFields) {
      const list = sections.get(field.section) ?? [];
      list.push(field);
      sections.set(field.section, list);
    }
    return [...sections.entries()];
  }, [customFields]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "departmentId") next.divisionId = "";
      return next;
    });
  }

  function cancelEdit() {
    setForm(initialForm(user));
    setEditing(false);
  }

  async function saveProfile() {
    if (!form.firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    if (
      canEditAll &&
      (!form.email.trim() || !form.joinDate)
    ) {
      toast.error("First name, email, and joining date are required.");
      return;
    }
    for (const field of canEditAll ? customFields : []) {
      if (
        field.required &&
        (form.customValues[field.key] === undefined ||
          form.customValues[field.key] === null ||
          form.customValues[field.key] === "")
      ) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/hrms/employees/${user.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canEditAll ? {
          employeeNumber: form.employeeNumber
            ? Number(form.employeeNumber)
            : null,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          photo: form.photo,
          designation: form.designation,
          branchId: form.branchId || null,
          departmentId: form.departmentId || null,
          divisionId: form.divisionId || null,
          managerId: form.managerId || null,
          tlId: form.tlId || null,
          active: form.active === "ACTIVE",
          dob: form.dob,
          gender: form.gender,
          employmentType: form.employmentType,
          personalPhone: form.personalPhone,
          aadhaar: form.aadhaar,
          pan: form.pan,
          uan: form.uan,
          bankName: form.bankName,
          bankAccount: form.bankAccount,
          ifsc: form.ifsc,
          joinDate: form.joinDate,
          exitDate: form.exitDate,
          grade: form.grade,
          ctc: form.ctc ? Number(form.ctc) : null,
          basic: form.basic ? Number(form.basic) : null,
          hra: form.hra ? Number(form.hra) : null,
          conveyance: form.conveyance ? Number(form.conveyance) : null,
          transport: form.transport ? Number(form.transport) : null,
          travelling: form.travelling ? Number(form.travelling) : null,
          fixedAllowance: form.fixedAllowance
            ? Number(form.fixedAllowance)
            : null,
          stipend: form.stipend ? Number(form.stipend) : null,
          priorExperienceYears: form.priorExperienceYears
            ? Number(form.priorExperienceYears)
            : null,
          profile: {
            nickname: form.nickname,
            fatherName: form.fatherName,
            businessUnit: form.businessUnit,
            location: form.location,
            streams: form.streams,
            externalRole: form.externalRole,
            sourceOfHire: form.sourceOfHire,
            aboutMe: form.aboutMe,
            bloodGroup: form.bloodGroup,
            weddingDay: form.weddingDay,
            maritalStatus: form.maritalStatus,
            expertise: form.expertise,
            workPhone: form.workPhone,
            extension: form.extension,
            seatingLocation: form.seatingLocation,
            tags: form.tags,
            personalEmail: form.personalEmail,
            presentAddress: form.presentAddress,
            presentStateCode: form.presentStateCode,
            permanentAddress: form.permanentAddress,
            bankHolderName: form.bankHolderName,
            paymentMode: form.paymentMode,
            oldAccountNumber: form.oldAccountNumber,
            accountType: form.accountType,
            onboardingStatus: form.onboardingStatus,
            education: form.education,
            workExperience: form.workExperience,
            dependents: form.dependents,
          },
          customValues: form.customValues,
        } : {
          firstName: form.firstName,
          lastName: form.lastName,
          photo: form.photo,
          dob: form.dob,
          gender: form.gender,
          personalPhone: form.personalPhone,
          aadhaar: form.aadhaar,
          pan: form.pan,
          uan: form.uan,
          profile: {
            nickname: form.nickname,
            fatherName: form.fatherName,
            aboutMe: form.aboutMe,
            bloodGroup: form.bloodGroup,
            weddingDay: form.weddingDay,
            maritalStatus: form.maritalStatus,
            expertise: form.expertise,
            personalEmail: form.personalEmail,
            presentAddress: form.presentAddress,
            presentStateCode: form.presentStateCode,
            permanentAddress: form.permanentAddress,
            education: form.education,
            workExperience: form.workExperience,
            dependents: form.dependents,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(apiErrorMessage(result, "Unable to save profile"));
      }
      toast.success(
        canEditAll
          ? "Employee profile updated."
          : "Your profile details were updated.",
      );
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save profile",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRoles() {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: selectedRoles }),
      });
      if (!response.ok) throw new Error("Unable to update roles");
      setEditRoles(false);
      router.refresh();
      toast.success("Employee roles updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update roles");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!response.ok) throw new Error("Unable to reset password");
      setNewPassword("");
      setShowPwReset(false);
      toast.success("Password reset.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    const action = user.active ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${action} ${user.name}?`)) return;
    set("active", user.active ? "INACTIVE" : "ACTIVE");
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!response.ok) throw new Error(`Unable to ${action.toLowerCase()} employee`);
      router.refresh();
      toast.success(`Employee ${action.toLowerCase()}d.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update employee");
    } finally {
      setSaving(false);
    }
  }

  async function resendInvitation() {
    setResendingInvitation(true);
    try {
      const response = await fetch(
        `/api/hrms/employees/${user.id}/invitation`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(result, "Unable to resend invitation"),
        );
      }
      if (result.deliveryStatus === "FAILED") {
        toast.warning(
          "A new invitation was created, but email delivery failed.",
        );
      } else {
        toast.success("A new employee invitation was sent.");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to resend invitation",
      );
    } finally {
      setResendingInvitation(false);
    }
  }

  return (
    <div className="mnx-employee-profile">
      {canEdit ? (
        <div className="mnx-employee-profile-toolbar">
          {!canEditAll ? (
            <p className="mnx-employee-profile-help">
              Self-service editing covers personal, contact, identity,
              education, experience, and dependant details. HR controls work,
              payroll, bank, joining, and organisation fields.
            </p>
          ) : <span />}
          <div className="mnx-employee-profile-actions">
          {editing ? (
            <>
              <MnxAction variant="primary" onClick={saveProfile} disabled={saving}>
                {saving
                  ? "Saving…"
                  : canEditAll
                    ? "Save all changes"
                    : "Save my details"}
              </MnxAction>
              <MnxAction onClick={cancelEdit} disabled={saving}>
                Cancel
              </MnxAction>
            </>
          ) : (
            <MnxAction variant="primary" onClick={() => setEditing(true)}>
              {canEditAll ? "Edit all details" : "Edit my details"}
            </MnxAction>
          )}
          </div>
        </div>
      ) : null}

      {!user.active && latestInvitation ? (
        <section className="mnx-employee-profile-alert">
          <div className="mnx-employee-profile-alert-copy">
            <span className="mnx-employee-profile-alert-icon">
              <MailCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="mnx-employee-profile-alert-title">
                Employee invitation{" "}
                {latestInvitation.deliveryStatus === "FAILED"
                  ? "delivery failed"
                  : new Date(latestInvitation.expiresAt).getTime() <=
                      profileLoadedAt
                    ? "expired"
                    : "pending"}
              </h2>
              <p className="mnx-employee-profile-alert-description">
                Login stays disabled until the employee accepts the secure link
                and creates a password.
                {latestInvitation.deliveryError
                  ? ` Delivery response: ${latestInvitation.deliveryError}`
                  : ""}
              </p>
            </div>
          </div>
          {canInvite ? (
            <MnxAction
              disabled={resendingInvitation}
              onClick={resendInvitation}
              variant="secondary"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {resendingInvitation ? "Sending…" : "Resend invitation"}
            </MnxAction>
          ) : null}
        </section>
      ) : null}

      <div className="mnx-employee-profile-sections">
        <InfoCard icon={<CircleUserRound />} title="Basic Information">
          <ValueGrid>
            <div className="mnx-employee-profile-field is-span">
              <div className="mnx-employee-profile-label">Profile photo</div>
              <div className="mnx-employee-profile-avatar-field">
                <div
                  className="mnx-employee-profile-avatar-preview"
                  aria-label={
                    form.photo
                      ? `${form.firstName || user.name} profile photo preview`
                      : `${form.firstName || user.name} initials avatar`
                  }
                >
                  {form.photo ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="72px"
                      src={form.photo}
                      unoptimized
                    />
                  ) : (
                    <span>{initialsFor(form.firstName || user.name)}</span>
                  )}
                </div>
                <div className="mnx-employee-profile-avatar-copy">
                  {editing ? (
                    <>
                      <Input
                        type="url"
                        value={form.photo}
                        onChange={(event) => set("photo", event.target.value)}
                        placeholder="Paste employee photo URL"
                      />
                      <p className="mnx-employee-profile-avatar-help">
                        Add a direct image link to show the employee photo
                        across profile, lists, and approvals.
                      </p>
                    </>
                  ) : (
                    <div className="mnx-employee-profile-value">
                      {form.photo
                        ? "Employee photo added"
                        : "No profile photo"}
                    </div>
                  )}
                </div>
                {editing && form.photo ? (
                  <MnxAction
                    type="button"
                    variant="secondary"
                    onClick={() => set("photo", "")}
                  >
                    Remove photo
                  </MnxAction>
                ) : null}
              </div>
            </div>
            <ValueField label="Employee ID" editing={hrEditing} value={form.employeeNumber}>
              <Input type="number" min="1" value={form.employeeNumber} onChange={(event) => set("employeeNumber", event.target.value)} />
            </ValueField>
            <ValueField label="Nick name" editing={editing} value={form.nickname}>
              <Input value={form.nickname} onChange={(event) => set("nickname", event.target.value)} />
            </ValueField>
            <ValueField label="First Name" editing={editing} value={form.firstName}>
              <Input value={form.firstName} onChange={(event) => set("firstName", event.target.value)} />
            </ValueField>
            <ValueField label="Email address" editing={hrEditing} value={form.email}>
              <Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
            </ValueField>
            <ValueField label="Last Name" editing={editing} value={form.lastName}>
              <Input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
            </ValueField>
            <ValueField label="Father Name" editing={editing} value={form.fatherName}>
              <Input value={form.fatherName} onChange={(event) => set("fatherName", event.target.value)} />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<BriefcaseBusiness />} title="Work Information">
          <ValueGrid>
            <ValueField label="Business Unit" editing={hrEditing} value={form.businessUnit}>
              <Input value={form.businessUnit} onChange={(event) => set("businessUnit", event.target.value)} />
            </ValueField>
            <ValueField label="Branch" editing={hrEditing} value={user.branch?.name}>
              <Select value={form.branchId} onChange={(value) => set("branchId", value)} options={org?.branches ?? []} placeholder="No branch" />
            </ValueField>
            <ValueField label="Division" editing={hrEditing} value={user.division?.name}>
              <Select value={form.divisionId} onChange={(value) => set("divisionId", value)} options={activeDivisions} placeholder="No division" disabled={!form.departmentId} />
            </ValueField>
            <ValueField label="Department" editing={hrEditing} value={user.department?.name}>
              <Select value={form.departmentId} onChange={(value) => set("departmentId", value)} options={org?.departments ?? []} placeholder="No department" />
            </ValueField>
            <ValueField label="Location" editing={hrEditing} value={form.location}>
              <Input value={form.location} onChange={(event) => set("location", event.target.value)} />
            </ValueField>
            <ValueField label="Designation" editing={hrEditing} value={form.designation}>
              <Input value={form.designation} onChange={(event) => set("designation", event.target.value)} />
            </ValueField>
            <ValueField label="Streams" editing={hrEditing} value={form.streams}>
              <Input value={form.streams} onChange={(event) => set("streams", event.target.value)} />
            </ValueField>
            <ValueField label="External / Zoho Role" editing={hrEditing} value={form.externalRole}>
              <Input value={form.externalRole} onChange={(event) => set("externalRole", event.target.value)} />
            </ValueField>
            <ValueField label="Employment Type" editing={hrEditing} value={form.employmentType}>
              <TextSelect value={form.employmentType} onChange={(value) => set("employmentType", value)} options={["Permanent", "Temporary", "Contract", "Intern", "Trainee", "Probation"]} placeholder="Select type" />
            </ValueField>
            <ValueField label="Employee Status" editing={hrEditing} value={form.active === "ACTIVE" ? "Active" : "Inactive"}>
              <TextSelect value={form.active} onChange={(value) => set("active", value)} options={["ACTIVE", "INACTIVE"]} labels={{ ACTIVE: "Active", INACTIVE: "Inactive" }} placeholder="Select status" />
            </ValueField>
            <ValueField label="Source of Hire" editing={hrEditing} value={form.sourceOfHire}>
              <Input value={form.sourceOfHire} onChange={(event) => set("sourceOfHire", event.target.value)} />
            </ValueField>
            <ValueField label="Date of Joining" editing={hrEditing} value={displayDate(form.joinDate)}>
              <Input type="date" value={form.joinDate} onChange={(event) => set("joinDate", event.target.value)} />
            </ValueField>
            <ValueField label="Current Experience" value={durationFrom(form.joinDate)} />
            <ValueField label="Total Experience" value={`${form.priorExperienceYears || "0"} prior year(s) + ${durationFrom(form.joinDate)}`} />
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<Network />} title="Hierarchy Information">
          <ValueGrid>
            <ValueField label="Reporting Manager" editing={hrEditing} value={user.manager?.name}>
              <Select value={form.managerId} onChange={(value) => set("managerId", value)} options={otherUsers} placeholder="No reporting manager" />
            </ValueField>
            <ValueField label="Secondary Reporting Manager" editing={hrEditing} value={user.tl?.name}>
              <Select value={form.tlId} onChange={(value) => set("tlId", value)} options={otherUsers} placeholder="No secondary manager" />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<ContactRound />} title="Personal Details">
          <ValueGrid>
            <ValueField label="Date of Birth" editing={editing} value={displayDate(form.dob)}>
              <Input type="date" value={form.dob} onChange={(event) => set("dob", event.target.value)} />
            </ValueField>
            <ValueField label="Age" value={ageFrom(form.dob)} />
            <ValueField label="Gender" editing={editing} value={form.gender}>
              <TextSelect value={form.gender} onChange={(value) => set("gender", value)} options={["Male", "Female", "Non-binary", "Prefer not to say"]} placeholder="Select gender" />
            </ValueField>
            <ValueField label="Marital Status" editing={editing} value={form.maritalStatus}>
              <TextSelect value={form.maritalStatus} onChange={(value) => set("maritalStatus", value)} options={["Single", "Married", "Divorced", "Widowed"]} placeholder="Select status" />
            </ValueField>
            <ValueField label="Blood Group" editing={editing} value={form.bloodGroup}>
              <TextSelect value={form.bloodGroup} onChange={(value) => set("bloodGroup", value)} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} placeholder="Select blood group" />
            </ValueField>
            <ValueField label="Wedding Day" editing={editing} value={displayDate(form.weddingDay)}>
              <Input type="date" value={form.weddingDay} onChange={(event) => set("weddingDay", event.target.value)} />
            </ValueField>
            <ValueField label="About Me" editing={editing} value={form.aboutMe} span>
              <PeopleControlTextarea value={form.aboutMe} onChange={(event) => set("aboutMe", event.target.value)} rows={3} />
            </ValueField>
            <ValueField label="Ask me about / Expertise" editing={editing} value={form.expertise} span>
              <PeopleControlTextarea value={form.expertise} onChange={(event) => set("expertise", event.target.value)} rows={3} />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<IdCard />} title="Identity Information">
          <ValueGrid>
            <ValueField label="UAN" editing={editing} value={form.uan}>
              <Input value={form.uan} onChange={(event) => set("uan", event.target.value)} />
            </ValueField>
            <ValueField label="PAN" editing={editing} value={form.pan}>
              <Input value={form.pan} onChange={(event) => set("pan", event.target.value)} />
            </ValueField>
            <ValueField label="Aadhaar" editing={editing} value={form.aadhaar}>
              <Input value={form.aadhaar} onChange={(event) => set("aadhaar", event.target.value)} />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<UserRoundCheck />} title="Contact Details">
          <ValueGrid>
            <ValueField label="Work Phone Number" editing={hrEditing} value={form.workPhone}>
              <Input value={form.workPhone} onChange={(event) => set("workPhone", event.target.value)} />
            </ValueField>
            <ValueField label="Personal Mobile Number" editing={editing} value={form.personalPhone}>
              <Input value={form.personalPhone} onChange={(event) => set("personalPhone", event.target.value)} />
            </ValueField>
            <ValueField label="Extension" editing={hrEditing} value={form.extension}>
              <Input value={form.extension} onChange={(event) => set("extension", event.target.value)} />
            </ValueField>
            <ValueField label="Personal Email Address" editing={editing} value={form.personalEmail}>
              <Input type="email" value={form.personalEmail} onChange={(event) => set("personalEmail", event.target.value)} />
            </ValueField>
            <ValueField label="Seating Location" editing={hrEditing} value={form.seatingLocation}>
              <Input value={form.seatingLocation} onChange={(event) => set("seatingLocation", event.target.value)} />
            </ValueField>
            <ValueField label="Tags" editing={hrEditing} value={form.tags}>
              <Input value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="Comma-separated" />
            </ValueField>
            <ValueField label="Present Address" editing={editing} value={form.presentAddress} span>
              <PeopleControlTextarea value={form.presentAddress} onChange={(event) => set("presentAddress", event.target.value)} rows={3} />
            </ValueField>
            <ValueField label="State Code" editing={editing} value={form.presentStateCode}>
              <Input value={form.presentStateCode} onChange={(event) => set("presentStateCode", event.target.value)} />
            </ValueField>
            <ValueField label="Permanent Address" editing={editing} value={form.permanentAddress} span>
              <PeopleControlTextarea value={form.permanentAddress} onChange={(event) => set("permanentAddress", event.target.value)} rows={3} />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<Landmark />} title="Bank Details">
          <ValueGrid>
            <ValueField label="Account Holder Name" editing={hrEditing} value={form.bankHolderName}>
              <Input value={form.bankHolderName} onChange={(event) => set("bankHolderName", event.target.value)} />
            </ValueField>
            <ValueField label="IFSC Code" editing={hrEditing} value={form.ifsc}>
              <Input value={form.ifsc} onChange={(event) => set("ifsc", event.target.value)} />
            </ValueField>
            <ValueField label="Payment Mode" editing={hrEditing} value={form.paymentMode}>
              <TextSelect value={form.paymentMode} onChange={(value) => set("paymentMode", value)} options={["Direct Deposit", "Bank Transfer", "Cheque", "Cash"]} placeholder="Select payment mode" />
            </ValueField>
            <ValueField label="Account Type" editing={hrEditing} value={form.accountType}>
              <TextSelect value={form.accountType} onChange={(value) => set("accountType", value)} options={["Savings", "Current", "Salary"]} placeholder="Select account type" />
            </ValueField>
            <ValueField label="Bank Name" editing={hrEditing} value={form.bankName}>
              <Input value={form.bankName} onChange={(event) => set("bankName", event.target.value)} />
            </ValueField>
            <ValueField label="Account Number" editing={hrEditing} value={form.bankAccount}>
              <Input value={form.bankAccount} onChange={(event) => set("bankAccount", event.target.value)} />
            </ValueField>
            <ValueField label="Account Number OLD" editing={hrEditing} value={form.oldAccountNumber}>
              <Input value={form.oldAccountNumber} onChange={(event) => set("oldAccountNumber", event.target.value)} />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<BadgeIndianRupee />} title="Separation & Employment Record">
          <ValueGrid>
            <ValueField label="Date of Exit" editing={hrEditing} value={displayDate(form.exitDate)}>
              <Input type="date" value={form.exitDate} onChange={(event) => set("exitDate", event.target.value)} />
            </ValueField>
            <ValueField label="Onboarding Status" editing={hrEditing} value={form.onboardingStatus}>
              <TextSelect value={form.onboardingStatus} onChange={(value) => set("onboardingStatus", value)} options={["Not started", "In progress", "Completed", "On hold"]} placeholder="Select onboarding status" />
            </ValueField>
            <ValueField label="Grade" editing={hrEditing} value={form.grade}>
              <Input value={form.grade} onChange={(event) => set("grade", event.target.value)} />
            </ValueField>
            <ValueField label="Prior Experience (years)" editing={hrEditing} value={form.priorExperienceYears}>
              <Input type="number" min="0" step="0.1" value={form.priorExperienceYears} onChange={(event) => set("priorExperienceYears", event.target.value)} />
            </ValueField>
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<BadgeIndianRupee />} title="Salary Details">
          <ValueGrid>
            <ValueField label="Gross (Annual)" value={formatCurrency(payrollNumber(user.employmentRecord?.payrollMeta ?? null, "Revised Gross Amount (per annum)", "Gross Amount (per annum)_1"))} />
            <ValueField label="Gross (Monthly)" value={formatCurrency(user.employmentRecord?.payrollMeta?.monthlyGross)} />
            <CurrencyField label="CTC (Annual)" editing={hrEditing} value={form.ctc} onChange={(value) => set("ctc", value)} />
            <CurrencyField label="Basic" editing={hrEditing} value={form.basic} onChange={(value) => set("basic", value)} />
            <CurrencyField label="House Rent Allowance" editing={hrEditing} value={form.hra} onChange={(value) => set("hra", value)} />
            <CurrencyField label="Conveyance Allowance" editing={hrEditing} value={form.conveyance} onChange={(value) => set("conveyance", value)} />
            <CurrencyField label="Transport Allowance" editing={hrEditing} value={form.transport} onChange={(value) => set("transport", value)} />
            <CurrencyField label="Travelling Allowance" editing={hrEditing} value={form.travelling} onChange={(value) => set("travelling", value)} />
            <CurrencyField label="Fixed Allowance" editing={hrEditing} value={form.fixedAllowance} onChange={(value) => set("fixedAllowance", value)} />
            <CurrencyField label="Stipend" editing={hrEditing} value={form.stipend} onChange={(value) => set("stipend", value)} />
          </ValueGrid>
        </InfoCard>
      </div>

      <RepeatableSection
        icon={<BriefcaseBusiness />}
        title="Work Experience"
        editing={editing}
        columns={["Company name", "Job Title", "From Date", "To Date", "Job Description", "Relevant"]}
        emptyMessage="No work experience added."
        rows={form.workExperience}
        onAdd={() => set("workExperience", [...form.workExperience, { id: crypto.randomUUID(), companyName: "", jobTitle: "", fromDate: "", toDate: "", jobDescription: "", relevant: false }])}
        onRemove={(id) => set("workExperience", form.workExperience.filter((row) => row.id !== id))}
        renderRow={(row) => editing ? (
          <>
            <TableInput value={row.companyName} onChange={(value) => updateRow(form.workExperience, row.id, { companyName: value }, (rows) => set("workExperience", rows))} />
            <TableInput value={row.jobTitle} onChange={(value) => updateRow(form.workExperience, row.id, { jobTitle: value }, (rows) => set("workExperience", rows))} />
            <TableInput type="date" value={row.fromDate} onChange={(value) => updateRow(form.workExperience, row.id, { fromDate: value }, (rows) => set("workExperience", rows))} />
            <TableInput type="date" value={row.toDate} onChange={(value) => updateRow(form.workExperience, row.id, { toDate: value }, (rows) => set("workExperience", rows))} />
            <TableInput value={row.jobDescription} onChange={(value) => updateRow(form.workExperience, row.id, { jobDescription: value }, (rows) => set("workExperience", rows))} />
            <td className="px-3 py-2"><Input type="checkbox" checked={row.relevant} onChange={(event) => updateRow(form.workExperience, row.id, { relevant: event.target.checked }, (rows) => set("workExperience", rows))} /></td>
          </>
        ) : (
          <>
            <TableValue value={row.companyName} /><TableValue value={row.jobTitle} /><TableValue value={displayDate(row.fromDate)} /><TableValue value={displayDate(row.toDate)} /><TableValue value={row.jobDescription} /><TableValue value={row.relevant ? "Yes" : "No"} />
          </>
        )}
      />

      <RepeatableSection
        icon={<GraduationCap />}
        title="Education Details"
        editing={editing}
        columns={["Institute Name", "Degree / Diploma", "Specialization", "Date of Completion"]}
        emptyMessage="No education details added."
        rows={form.education}
        onAdd={() => set("education", [...form.education, { id: crypto.randomUUID(), instituteName: "", degree: "", specialization: "", completionDate: "" }])}
        onRemove={(id) => set("education", form.education.filter((row) => row.id !== id))}
        renderRow={(row) => editing ? (
          <>
            <TableInput value={row.instituteName} onChange={(value) => updateRow(form.education, row.id, { instituteName: value }, (rows) => set("education", rows))} />
            <TableInput value={row.degree} onChange={(value) => updateRow(form.education, row.id, { degree: value }, (rows) => set("education", rows))} />
            <TableInput value={row.specialization} onChange={(value) => updateRow(form.education, row.id, { specialization: value }, (rows) => set("education", rows))} />
            <TableInput value={row.completionDate} onChange={(value) => updateRow(form.education, row.id, { completionDate: value }, (rows) => set("education", rows))} />
          </>
        ) : (
          <><TableValue value={row.instituteName} /><TableValue value={row.degree} /><TableValue value={row.specialization} /><TableValue value={row.completionDate} /></>
        )}
      />

      <RepeatableSection
        icon={<HeartHandshake />}
        title="Dependent Details"
        editing={editing}
        columns={["Name", "Relationship", "Date of Birth"]}
        emptyMessage="No dependant details added."
        rows={form.dependents}
        onAdd={() => set("dependents", [...form.dependents, { id: crypto.randomUUID(), name: "", relationship: "", dateOfBirth: "" }])}
        onRemove={(id) => set("dependents", form.dependents.filter((row) => row.id !== id))}
        renderRow={(row) => editing ? (
          <>
            <TableInput value={row.name} onChange={(value) => updateRow(form.dependents, row.id, { name: value }, (rows) => set("dependents", rows))} />
            <TableInput value={row.relationship} onChange={(value) => updateRow(form.dependents, row.id, { relationship: value }, (rows) => set("dependents", rows))} />
            <TableInput type="date" value={row.dateOfBirth} onChange={(value) => updateRow(form.dependents, row.id, { dateOfBirth: value }, (rows) => set("dependents", rows))} />
          </>
        ) : (
          <><TableValue value={row.name} /><TableValue value={row.relationship} /><TableValue value={displayDate(row.dateOfBirth)} /></>
        )}
      />

      {customSections.map(([section, fields]) => (
        <InfoCard key={section} icon={<Settings2 />} title={section}>
          <ValueGrid>
            {fields.map((field) => (
              <ValueField key={field.id} label={field.label} editing={hrEditing} value={field.type === "DATE" ? displayDate(String(form.customValues[field.key] ?? "")) : form.customValues[field.key]} span={field.type === "TEXTAREA"}>
                <CustomFieldControl field={field} value={form.customValues[field.key]} onChange={(value) => set("customValues", { ...form.customValues, [field.key]: value })} />
              </ValueField>
            ))}
          </ValueGrid>
        </InfoCard>
      ))}

      <div className="mnx-employee-profile-sections">
        <InfoCard icon={<Building2 />} title="System Fields">
          <ValueGrid>
            <ValueField label="Added By" value={user.employeeProfile?.createdById ? actorNames.get(user.employeeProfile.createdById) : "Imported / System"} />
            <ValueField label="Added Time" value={new Date(user.employeeProfile?.createdAt ?? user.createdAt).toLocaleString("en-IN")} />
            <ValueField label="Modified By" value={user.employeeProfile?.modifiedById ? actorNames.get(user.employeeProfile.modifiedById) : "Imported / System"} />
            <ValueField label="Modified Time" value={new Date(user.employeeProfile?.updatedAt ?? user.updatedAt).toLocaleString("en-IN")} />
          </ValueGrid>
        </InfoCard>

        <InfoCard icon={<Settings2 />} title="Roles & Account Actions">
          {canEditRoles && editRoles ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <MnxAction key={role.id} variant={selectedRoles.includes(role.id) ? "primary" : "secondary"} onClick={() => setSelectedRoles((current) => current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id])}>
                    {role.name}
                  </MnxAction>
                ))}
              </div>
              <div className="flex gap-2"><MnxAction variant="primary" onClick={saveRoles} disabled={saving}>Save roles</MnxAction><MnxAction onClick={() => setEditRoles(false)}>Cancel</MnxAction></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">{user.roles.length ? user.roles.map((role) => <span key={role.role.id} className="mnx-status-pill">{role.role.name}</span>) : <span className="mnx-people-muted">No roles assigned</span>}</div>
              <div className="flex flex-wrap gap-2">
                {canEditRoles ? <MnxAction onClick={() => setEditRoles(true)}>Edit roles</MnxAction> : null}
                {canDeactivate ? <MnxAction variant={user.active ? "destructive" : "secondary"} onClick={toggleActive} disabled={saving}>{user.active ? "Deactivate" : "Reactivate"} employee</MnxAction> : null}
                {canResetPassword && !showPwReset ? <MnxAction onClick={() => setShowPwReset(true)}>Reset password</MnxAction> : null}
              </div>
              {canResetPassword && showPwReset ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (minimum 8 characters)" />
                  <MnxAction variant="primary" onClick={resetPassword} disabled={saving || newPassword.length < 8}>Reset</MnxAction>
                  <MnxAction onClick={() => setShowPwReset(false)}>Cancel</MnxAction>
                </div>
              ) : null}
            </div>
          )}
        </InfoCard>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="mnx-employee-profile-section">
      <div className="mnx-employee-profile-section-header">
        <span className="mnx-employee-profile-section-icon [&>svg]:size-5">{icon}</span>
        <h2 className="mnx-title-3">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ValueGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mnx-employee-profile-grid">
      {children}
    </div>
  );
}

function ValueField({ label, value, editing = false, children, span = false }: { label: string; value: unknown; editing?: boolean; children?: ReactNode; span?: boolean }) {
  return (
    <div className={span ? "mnx-employee-profile-field is-span" : "mnx-employee-profile-field"}>
      <div className="mnx-employee-profile-label">{label}</div>
      {editing && children ? children : <div className="mnx-employee-profile-value">{display(value)}</div>}
    </div>
  );
}

function CurrencyField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <ValueField
      label={label}
      editing={editing}
      value={value ? formatCurrency(Number(value)) : "—"}
    >
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </ValueField>
  );
}

function Select({ value, onChange, options, placeholder, disabled }: { value: string; onChange: (value: string) => void; options: { id: string; name: string }[]; placeholder: string; disabled?: boolean }) {
  return <DropdownSelect ariaLabel={placeholder} disabled={disabled} onValueChange={onChange} options={[{ value: "", label: placeholder }, ...options.map((option) => ({ value: option.id, label: option.name }))]} triggerClassName="w-full" value={value} />;
}

function TextSelect({ value, onChange, options, placeholder, labels = {} }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string; labels?: Record<string, string> }) {
  return <DropdownSelect ariaLabel={placeholder} onValueChange={onChange} options={[{ value: "", label: placeholder }, ...options.map((option) => ({ value: option, label: labels[option] ?? option }))]} triggerClassName="w-full" value={value} />;
}

function RepeatableSection<T extends RepeatableRow>({ icon, title, editing, columns, emptyMessage, rows, onAdd, onRemove, renderRow }: { icon: ReactNode; title: string; editing: boolean; columns: string[]; emptyMessage: string; rows: T[]; onAdd: () => void; onRemove: (id: string) => void; renderRow: (row: T) => ReactNode }) {
  return (
    <InfoCard icon={icon} title={title}>
      <div className="mnx-employee-profile-table-wrap">
        <PeopleControlTable>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}{editing ? <th aria-label="Actions" /> : null}</tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={columns.length + (editing ? 1 : 0)} className="px-3 py-8 text-center text-sm text-mono-muted">{emptyMessage}</td></tr> : rows.map((row) => (
              <tr key={row.id}>{renderRow(row)}{editing ? <td className="px-3 py-2"><MnxAction aria-label={`Remove ${title} row`} variant="destructive" onClick={() => onRemove(row.id)}><Trash2 className="size-4" /></MnxAction></td> : null}</tr>
            ))}
          </tbody>
        </PeopleControlTable>
      </div>
      {editing ? <MnxAction className="mnx-employee-profile-add-row" onClick={onAdd}><Plus className="size-4" /> Add row</MnxAction> : null}
    </InfoCard>
  );
}

function updateRow<T extends RepeatableRow>(rows: T[], id: string, patch: Partial<T>, commit: (rows: T[]) => void) {
  commit(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
}

function TableInput({ value, onChange, type = "text" }: { value: string; onChange: (value: string) => void; type?: string }) {
  return <td className="min-w-40 px-2 py-2"><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></td>;
}

function TableValue({ value }: { value: unknown }) {
  return <td className="px-3 py-3 text-sm text-mono-muted">{display(value)}</td>;
}

function CustomFieldControl({ field, value, onChange }: { field: CustomField; value: string | number | boolean | null | undefined; onChange: (value: string | number | boolean | null) => void }) {
  if (field.type === "TEXTAREA") return <PeopleControlTextarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} rows={3} required={field.required} />;
  if (field.type === "SELECT") {
    const options = Array.isArray(field.options) ? field.options.filter((option): option is string => typeof option === "string") : [];
    return <TextSelect value={String(value ?? "")} onChange={onChange} options={options} placeholder={`Select ${field.label}`} />;
  }
  if (field.type === "BOOLEAN") return <label className="flex items-center gap-2 text-sm text-mono-text"><Input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> Yes</label>;
  return <Input type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"} value={String(value ?? "")} onChange={(event) => onChange(field.type === "NUMBER" && event.target.value !== "" ? Number(event.target.value) : event.target.value)} required={field.required} />;
}
