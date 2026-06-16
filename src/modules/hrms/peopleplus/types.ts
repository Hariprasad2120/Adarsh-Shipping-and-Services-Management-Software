export type ModuleKey =
  | "home"
  | "onboarding"
  | "leavetracker"
  | "attendance"
  | "timetracker"
  | "performance"
  | "lms"
  | "files"
  | "employeeengagement"
  | "hrcase"
  | "hrservices"
  | "travel"
  | "task"
  | "salarydetails"
  | "generalservice"
  | "okr"
  | "operations"
  | "workreports"
  | "reports"
  | "approvals";

export type NavModule = {
  key: ModuleKey;
  label: string;
  icon: string;
  visible: boolean;
  route: string;
  permission?: string;
};

export type UserProfile = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  role: string;
  location?: string;
  avatarUrl?: string;
  attendanceStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT";
  totalInTime: string;
  widgets: any[];
  designation?: string;
  department?: string;
  branch?: string;
};

export type DashboardWidget = {
  key: string;
  title: string;
  width: "sm" | "md" | "lg" | "full";
  status: "empty" | "loading" | "ready";
  emptyMessage?: string;
};

export type WorkDay = {
  date: string;
  weekday: string;
  day: string;
  label?: string;
  isToday?: boolean;
  isWeekend?: boolean;
  shift?: string;
  shiftTime?: string;
};

export type ServiceDefinitionType = {
  id: string;
  position: number;
  key: string;
  name: string;
  icon: string;
  enabled: boolean;
  forms: string[];
};

export type FileRow = {
  id: string;
  name: string;
  scope: "personal" | "organization" | "employee";
  sharedWith?: string;
  folder?: string;
  updatedOn: string;
  fileSize?: string;
  mimeType?: string;
};

export type UserRow = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  doj?: string;
  role: string;
  location?: string;
  employeeStatus: "ACTIVE" | "INACTIVE" | "ON_NOTICE" | "EXITED" | "TERMINATED";
  accountStatus: "LOGIN_ENABLED" | "LOGIN_DISABLED" | "INVITED" | "NOT_INVITED";
};
