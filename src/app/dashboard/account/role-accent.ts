import { ROLES } from "@/constants/roles"

type Role = (typeof ROLES)[keyof typeof ROLES]

// Kept in sync with the accent mapping in components/sidebar.tsx.
export const roleAccents: Record<Role, { bg: string; color: string }> = {
  [ROLES.SUPER_ADMIN]: { bg: "#fef3c7", color: "#92400e" },
  [ROLES.ORG_ADMIN]: { bg: "#eff6ff", color: "#1e3a8a" },
  [ROLES.INSTITUTION_ADMIN]: { bg: "#e0f2fe", color: "#0369a1" },
  [ROLES.HOD]: { bg: "#d1fae5", color: "#065f46" },
  [ROLES.PROGRAM_HEAD]: { bg: "#ffedd5", color: "#c2410c" },
  [ROLES.FACULTY]: { bg: "#e0f2fe", color: "#0c4a6e" },
  [ROLES.STUDENT]: { bg: "#ffedd5", color: "#c2410c" },
  [ROLES.PARENT]: { bg: "#fef3c7", color: "#b45309" },
}

export const roleLabels: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ORG_ADMIN]: "Org Admin",
  [ROLES.INSTITUTION_ADMIN]: "Institution Admin",
  [ROLES.HOD]: "Head of Dept",
  [ROLES.PROGRAM_HEAD]: "Program Head",
  [ROLES.FACULTY]: "Faculty",
  [ROLES.STUDENT]: "Student",
  [ROLES.PARENT]: "Parent",
}

export const roleGradients: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "from-amber-400 to-orange-500",
  [ROLES.ORG_ADMIN]: "from-blue-600 to-slate-800",
  [ROLES.INSTITUTION_ADMIN]: "from-sky-500 to-blue-600",
  [ROLES.HOD]: "from-emerald-500 to-teal-600",
  [ROLES.PROGRAM_HEAD]: "from-amber-500 to-orange-600",
  [ROLES.FACULTY]: "from-sky-500 to-blue-700",
  [ROLES.STUDENT]: "from-orange-500 to-amber-600",
  [ROLES.PARENT]: "from-amber-400 to-orange-500",
}
