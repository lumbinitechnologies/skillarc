"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { StudentWithSection } from "@/modules/students"
import { Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react"

const ROWS_OPTIONS = [10, 25, 50, 100] as const

interface StudentListProps {
  students: StudentWithSection[]
  isLoading?: boolean
  onEdit?: (student: StudentWithSection) => void
  onView?: (student: StudentWithSection) => void
  onDelete?: (studentId: string) => void
  // Pagination
  totalCount: number
  page: number
  limit: number
  totalPages: number
  rangeFrom: number
  rangeTo: number
  onPrev: () => void
  onNext: () => void
  onLimitChange: (limit: number) => void
}

export function StudentList({
  students,
  isLoading = false,
  onEdit,
  onView,
  onDelete,
  totalCount,
  page,
  limit,
  totalPages,
  rangeFrom,
  rangeTo,
  onPrev,
  onNext,
  onLimitChange,
}: StudentListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 bg-white rounded-2xl">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-4 animate-pulse py-3 border-b border-slate-100/50 last:border-0">
            <div className="h-4 w-4 rounded bg-slate-100 shrink-0" />
            <div className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-1/4 rounded bg-slate-100" />
            </div>
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100" />
            <div className="h-8 w-16 rounded bg-slate-100 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-muted-foreground">
        No students found.
      </div>
    )
  }

  return (
    <>
      {/* 2. Fixed-height scrolling container so sticky header actually works */}
      <div className="max-h-[650px] overflow-auto">
        <Table>

          <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
            <TableRow>
              {/* 3. Select-all checkbox */}
              <TableHead className="w-12 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 accent-[#6C63FF] cursor-pointer"
                />
              </TableHead>
              <TableHead>USN</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {students.map((student, index) => {
              const isChecked = selectedIds.has(student.id)

              return (
                <TableRow
                  key={student.id}
                  onClick={() => onView?.(student)}
                  className={`
                    !border-0 cursor-pointer transition-colors
                    ${isChecked
                      ? "bg-indigo-50/70"
                      : index % 2 === 0 ? "bg-white" : "bg-muted/10"
                    }
                    hover:bg-muted/50
                  `}
                >
                  {/* 3. Per-row checkbox */}
                  <TableCell className="text-center w-12">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleOne(student.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 accent-[#6C63FF] cursor-pointer"
                    />
                  </TableCell>

                  <TableCell className="font-medium">
                    {student.registration_number || "-"}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] text-white font-semibold shrink-0 shadow-sm shadow-indigo-100">
                        {student.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {student.section?.program?.name || "-"}
                  </TableCell>

                  <TableCell>
                    {student.semester ? `Sem ${student.semester}` : "-"}
                  </TableCell>

                  <TableCell>
                    {student.section?.name || "-"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        student.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                      }
                    >
                      <span className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${student.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                        {student.is_active ? "Active" : "Inactive"}
                      </span>
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-[#6C63FF] hover:bg-indigo-50 border-indigo-100/50 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit?.(student)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete?.(student.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              )
            })}
          </TableBody>

        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-6 py-4 text-sm text-muted-foreground">

        <span>
          {totalCount === 0
            ? "No students"
            : `Showing ${rangeFrom.toLocaleString()}–${rangeTo.toLocaleString()} of ${totalCount.toLocaleString()} student${totalCount !== 1 ? "s" : ""}`
          }
        </span>

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2">
            <span className="text-xs">Rows</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => onLimitChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROWS_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onPrev}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onNext}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}