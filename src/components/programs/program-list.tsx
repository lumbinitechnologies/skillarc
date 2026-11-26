"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ProgramWithDepartment } from "@/modules/programs"
import { Trash2, Edit2, BookOpen } from "lucide-react"

interface ProgramListProps {
  programs: ProgramWithDepartment[]
  isLoading?: boolean
  onEdit?: (program: ProgramWithDepartment) => void
  onDelete?: (programId: string) => void
}

export function ProgramList({
  programs,
  isLoading = false,
  onEdit,
  onDelete,
}: ProgramListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!programs?.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        No programs found. Create one to get started.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {programs.map((program) => (
        <Card
          key={program.id}
          className="group p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{program.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {program.department?.name ?? "No Department"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-[#6C63FF]">
              Program
            </Badge>
          </div>

          <div className="mt-5 flex gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => onEdit?.(program)}
            >
              <Edit2 className="mr-1 h-4 w-4" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl bg-white text-red-600 hover:bg-red-50"
              onClick={() => onDelete?.(program.id)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}