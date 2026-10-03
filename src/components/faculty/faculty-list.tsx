"use client"

import { motion, AnimatePresence } from "framer-motion"
import { GraduationCap, Mail, Trash2, Edit2, BookOpen, Users, Send } from "lucide-react"
import type { FacultyWithStats } from "@/modules/faculty/types/faculty.types"
import { ListSkeleton, EmptyState } from "@/components/ui/page-shell"

interface FacultyListProps {
  faculty: FacultyWithStats[]
  isLoading?: boolean
  onEdit?: (faculty: FacultyWithStats) => void
  onDelete?: (facultyId: string) => void
  onResendInvite?: (faculty: FacultyWithStats) => void
}

const roleLabel: Record<string, string> = {
  HOD: "Head of Dept.",
  PROGRAM_HEAD: "Program Head",
  FACULTY: "Faculty Member",
}

const roleBadge: Record<string, string> = {
  HOD: "bg-emerald-50 text-emerald-700 border-emerald-100",
  PROGRAM_HEAD: "bg-pink-50 text-pink-700 border-pink-100",
  FACULTY: "bg-slate-50 text-slate-600 border-slate-100",
}

export function FacultyList({
  faculty,
  isLoading = false,
  onEdit,
  onDelete,
  onResendInvite,
}: FacultyListProps) {
  if (isLoading) return <ListSkeleton rows={5} />

  if (!faculty || faculty.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap className="h-6 w-6" />}
        title="No faculty found"
        description="Add faculty members to start assigning courses and building the timetable."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-[2.5fr_2fr_1.5fr_0.5fr_0.5fr_auto] gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Member</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Email</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Department</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 text-center">Subjects</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 text-center">Sections</span>
        <span className="w-20" />
      </div>

      <AnimatePresence initial={false}>
        {faculty.map((f, idx) => {
          const initials = f.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) ?? "?"

          const role = f.role ?? "FACULTY"

          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              className={`group border-b border-slate-50 px-6 py-4 transition-colors duration-150 hover:bg-slate-50/50 ${
                idx === faculty.length - 1 ? "border-b-0" : ""
              }`}
            >
              {/* Mobile layout */}
              <div className="flex items-start justify-between gap-3 md:hidden">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={initials} imageUrl={f.profile_image_url} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{f.name}</p>
                    <p className="text-xs text-slate-400 truncate">{f.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.department?.name ?? "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <ActionButton icon={<Edit2 className="h-3.5 w-3.5" />} onClick={() => onEdit?.(f)} />
                  <ActionButton icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDelete?.(f.id)} danger />
                </div>
              </div>

              {/* Desktop grid row */}
              <div className="hidden md:grid grid-cols-[2.5fr_2fr_1.5fr_0.5fr_0.5fr_auto] gap-4 items-center">
                {/* Name + role */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={initials} imageUrl={f.profile_image_url} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm truncate">{f.name}</p>
                      {role !== "FACULTY" && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${roleBadge[role] ?? roleBadge.FACULTY}`}>
                          {roleLabel[role] ?? role}
                        </span>
                      )}
                      {f.is_timetable_builder && (
                        <span className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/6 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] shrink-0">
                          Timetable
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {roleLabel[role] ?? "Faculty Member"}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <span className="text-sm text-slate-600 truncate">{f.email}</span>
                </div>

                {/* Department */}
                <span className="text-sm text-slate-600 truncate">
                  {f.department?.name || <span className="text-slate-400 italic">Not assigned</span>}
                </span>

                {/* Subjects */}
                <div className="flex justify-center">
                  <StatPill icon={<BookOpen className="h-3 w-3" />} value={f.assignedSubjects ?? 0} />
                </div>

                {/* Sections */}
                <div className="flex justify-center">
                  <StatPill icon={<Users className="h-3 w-3" />} value={f.assignedSections ?? 0} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 justify-end">
                  {onResendInvite && (
                    <ActionButton
                      icon={<Send className="h-3.5 w-3.5" />}
                      onClick={() => onResendInvite(f)}
                      title="Resend invite"
                    />
                  )}
                  <ActionButton icon={<Edit2 className="h-3.5 w-3.5" />} onClick={() => onEdit?.(f)} title="Edit" />
                  <ActionButton icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDelete?.(f.id)} danger title="Remove" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Footer */}
      <div className="border-t border-slate-50 bg-slate-50/50 px-6 py-3">
        <p className="text-xs text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-600">{faculty.length}</span> member{faculty.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, imageUrl }: { initials: string; imageUrl?: string | null }) {
  return (
    <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-black overflow-hidden border border-[var(--primary)]/10">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

function StatPill({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
      {icon}
      {value}
    </span>
  )
}

function ActionButton({
  icon,
  onClick,
  danger = false,
  title,
}: {
  icon: React.ReactNode
  onClick?: () => void
  danger?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 ${
        danger
          ? "text-slate-300 hover:bg-red-50 hover:text-red-500"
          : "text-slate-300 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {icon}
    </button>
  )
}