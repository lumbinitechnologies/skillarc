import { ROLES } from "@/constants/roles"

type Role = (typeof ROLES)[keyof typeof ROLES]

// Kept in sync with the accent mapping in components/sidebar.tsx.
export const roleAccents: Record<Role, { bg: string; color: string }> = {
  [ROLES.SUPER_ADMIN]: { bg: "#fef3c7", color: "#92400e" },
  [ROLES.ORG_ADMIN]: { bg: "#ede9fe", color: "#5b21b6" },
  [ROLES.INSTITUTION_ADMIN]: { bg: "#dbeafe", color: "#1e40af" },
  [ROLES.HOD]: { bg: "#d1fae5", color: "#065f46" },
  [ROLES.PROGRAM_HEAD]: { bg: "#fce7f3", color: "#9d174d" },
  [ROLES.FACULTY]: { bg: "#e0f2fe", color: "#0c4a6e" },
  [ROLES.STUDENT]: { bg: "#f0fdf4", color: "#166534" },
  [ROLES.PARENT]: { bg: "#fdf4ff", color: "#701a75" },
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
  [ROLES.ORG_ADMIN]: "from-violet-500 to-purple-600",
  [ROLES.INSTITUTION_ADMIN]: "from-blue-500 to-indigo-600",
  [ROLES.HOD]: "from-emerald-500 to-teal-600",
  [ROLES.PROGRAM_HEAD]: "from-pink-500 to-fuchsia-600",
  [ROLES.FACULTY]: "from-[var(--primary)] to-[var(--secondary)]",
  [ROLES.STUDENT]: "from-green-500 to-emerald-600",
  [ROLES.PARENT]: "from-fuchsia-500 to-purple-600",
}
