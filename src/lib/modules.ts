/**
 * SINGLE SOURCE OF TRUTH for permission modules.
 * Add a module here and it automatically appears as a row in the
 * Roles & Permissions matrix — nothing else to update.
 */
export const MODULES = [
  "students",
  "admissions",
  "parents",
  "employees",
  "teachers",
  "departments",
  "classes",
  "subjects",
  "attendance",
  "timetable",
  "exams",
  "homework",
  "fees",
  "finance",
  "payroll",
  "library",
  "inventory",
  "transport",
  "donations",
  "messaging",
  "events",
  "notifications",
  "reports",
  "import",
  "users",
  "settings",
  "audit",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export type PermissionAction = "read" | "write" | "update" | "delete";

export const PERMISSION_ACTIONS: PermissionAction[] = ["read", "write", "update", "delete"];

export function moduleLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
