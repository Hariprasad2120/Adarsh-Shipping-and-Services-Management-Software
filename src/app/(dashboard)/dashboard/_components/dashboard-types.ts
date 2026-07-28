import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";

export type DashboardTab = "myspace" | "team" | "organization";

export type PunchAction = "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK";

export interface DashboardSessionUser {
  id: string;
  name: string;
  email: string;
}

export interface ReporteeSummary {
  id: string;
  name: string;
  email: string;
  employeeNo: string;
  designation: string;
  location: string;
  photo: string | null;
  punchStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT";
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface DashboardExperienceProps {
  sessionUser: DashboardSessionUser;
  departments: unknown[];
  branches: unknown[];
  employees: unknown[];
  profile: UserProfile;
  widgets: DashboardWidgetsData;
  reportees: ReporteeSummary[];
  attendanceLoading: boolean;
  onPunchAction: (action: PunchAction) => Promise<void>;
}
