"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { FacultyWithStats } from "@/modules/faculty/types/faculty.types"
import { Trash2, Edit2, BookOpen, Users, GraduationCap } from "lucide-react"

interface FacultyListProps {
  faculty: FacultyWithStats[]
  isLoading?: boolean
  onEdit?: (faculty: FacultyWithStats) => void
  onDelete?: (facultyId: string) => void
}

export function FacultyList({
  faculty,
  isLoading = false,
  onEdit,
  onDelete,
}: FacultyListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!faculty || faculty.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        <p>No faculty found. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <Table>
        <TableHeader className="!border-0">
          <TableRow className="!border-0 bg-slate-50">
            <TableHead className="px-4 py-3">Faculty</TableHead>
            <TableHead className="px-4 py-3">Email</TableHead>
            <TableHead className="px-4 py-3">Department</TableHead>
            <TableHead className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="h-4 w-4" />
                Subjects
              </div>
            </TableHead>
            <TableHead className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                Sections
              </div>
            </TableHead>
            <TableHead className="px-4 py-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faculty.map((f) => (
            <TableRow key={f.id} className="hover:bg-slate-50/70">
              <TableCell className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-slate-900">{f.name}</p>
                      {f.role === "HOD" && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] py-0 px-2 font-bold rounded-lg border-0 shrink-0">
                          HOD
                        </Badge>
                      )}
                      {f.role === "PROGRAM_HEAD" && (
                        <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 text-[10px] py-0 px-2 font-bold rounded-lg border-0 shrink-0">
                          Program Head
                        </Badge>
                      )}
                      {f.is_timetable_builder && (
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[10px] py-0 px-2 font-bold rounded-lg border-0 shrink-0 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          Timetable Builder
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {f.role === "HOD" ? "Head of Department" : f.role === "PROGRAM_HEAD" ? "Program Coordinator" : "Faculty Member"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{f.email}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">
                {f.department?.name || "Not Assigned"}
              </TableCell>
              <TableCell className="px-4 py-3 text-center">
                <Badge variant="outline" className="bg-white text-slate-700">
                  {f.assignedSubjects || 0}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-center">
                <Badge variant="outline" className="bg-white text-slate-700">
                  {f.assignedSections || 0}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(f)}
                  className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.(f.id)}
                  className="h-8 w-8 p-0 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}