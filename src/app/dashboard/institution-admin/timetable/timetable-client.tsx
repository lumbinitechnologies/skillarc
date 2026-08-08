"use client"

import { TimetableSelector } from "@/components/timetable/timetable-selector"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { TimetableSettingsDialog } from "@/components/timetable/timetable-settings-dialog"
import { useState } from "react"
import { Settings } from "lucide-react"

interface Department {
  id: string
  name: string
}

interface Program {
  id: string
  name: string
  department_id?: string | null
}

interface Section {
  id: string
  name: string
  semester: number
  program_id: string
}

interface Props {
  departments: Department[]
  programs: Program[]
  sections: Section[]
  institutionId?: string
}

export function TimetableClientPage({
  departments,
  programs,
  sections,
  institutionId = "",
}: Props) {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            Timetable
          </h1>

          <p className="text-muted-foreground mt-1">
            Select a Program, Semester and Section to build a timetable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Settings size={15} /> Configure Timetable
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import CSV
          </button>
        </div>
      </div>

      <TimetableSelector
        departments={departments}
        programs={programs}
        sections={sections}
      />

      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="timetable"
        institutionId={institutionId}
        onImported={() => window.location.reload()}
      />

      <TimetableSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  )
}