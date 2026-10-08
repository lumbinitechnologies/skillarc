"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Users, Mail, Phone, GraduationCap, ChevronDown, ChevronUp } from "lucide-react"
import type { Parent } from "@/modules/parents"
import { useState } from "react"

interface ParentListProps {
  parents: Parent[]
  isLoading?: boolean
  onDelete?: (parentId: string) => void
  onRefresh?: () => void
}

export function ParentList({ parents, isLoading = false, onDelete }: ParentListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!parents || parents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
          <Users className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-slate-700">No parent accounts found</p>
        <p className="mt-1 text-sm text-slate-400 max-w-xs">
          Parent accounts are created automatically when you enroll a student with guardian details.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Parent</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Email</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Phone</span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Students</span>
        <span className="w-8" />
      </div>

      <AnimatePresence initial={false}>
        {parents.map((parent, idx) => {
          const students = (parent as any).students ?? []
          const isExpanded = expanded === parent.id
          const initials = parent.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) ?? "?"

          return (
            <motion.div
              key={parent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              {/* Row */}
              <div
                className={`group flex flex-col gap-3 border-b border-slate-50 px-6 py-4 transition-colors duration-150 hover:bg-slate-50/60 md:grid md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:items-center md:gap-4 ${
                  idx === parents.length - 1 ? "border-b-0" : ""
                }`}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-indigo-100 text-[#6C63FF] flex items-center justify-center text-xs font-black">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{parent.name}</p>
                    <p className="text-xs text-slate-400 md:hidden truncate">{parent.email}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="hidden md:flex items-center gap-2 min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <span className="text-sm text-slate-600 truncate">{parent.email || "—"}</span>
                </div>

                {/* Phone */}
                <div className="hidden md:flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <span className="text-sm text-slate-600">{(parent as any).phone || "—"}</span>
                </div>

                {/* Students count */}
                <div className="hidden md:flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <button
                    onClick={() => setExpanded(isExpanded ? null : parent.id)}
                    className="flex items-center gap-1 text-sm font-semibold text-[#6C63FF] hover:underline"
                  >
                    {students.length === 0 ? (
                      <span className="text-slate-400 font-normal">None</span>
                    ) : (
                      <>
                        {students.length}
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onDelete?.(parent.id)}
                    title="Remove parent"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded students */}
              <AnimatePresence>
                {isExpanded && students.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden border-b border-slate-50 bg-indigo-50/30"
                  >
                    <div className="px-6 py-4 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
                        Linked Students
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {students.map((stud: any) => (
                          <div
                            key={stud.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-1.5 shadow-sm"
                          >
                            <div className="h-6 w-6 rounded-lg bg-indigo-100 text-[#6C63FF] flex items-center justify-center text-[10px] font-black shrink-0">
                              {stud.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{stud.name}</p>
                              {stud.registration_number && (
                                <p className="text-[10px] text-slate-400">{stud.registration_number}</p>
                              )}
                            </div>
                            <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 shrink-0">
                              {stud.relationship}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Footer count */}
      <div className="border-t border-slate-50 bg-slate-50/50 px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-600">{parents.length}</span> parent{parents.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}
