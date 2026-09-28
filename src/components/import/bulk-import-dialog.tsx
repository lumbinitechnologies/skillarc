"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { useToast } from "../ui/use-toast"
import { AlertCircle, CheckCircle2, Download, FileText, UploadCloud } from "lucide-react"
import { normalizeImportRows, parseCsvText } from "@/lib/bulk-import"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: "students" | "faculty" | "subjects" | "faculty-subjects" | "parents" | "timetable"
  institutionId: string
  onImported?: () => void
}

const ENTITY_META: Record<BulkImportDialogProps["entity"], { title: string; description: string; hints: string[]; sampleCsv: string }> = {
  students: {
    title: "Import Students",
    description: "Upload a CSV with student details and section assignments.",
    hints: ["Required: name, email", "Optional: section_name, program_name, semester, registration_number, phone, admission_year"],
    sampleCsv: `name,email,section_name,semester,registration_number,phone,admission_year
John Doe,john.doe@example.com,Section A,1,REG1001,+1234567890,2024
Jane Smith,jane.smith@example.com,Section B,2,REG1002,+1234567891,2024`,
  },
  faculty: {
    title: "Import Faculty",
    description: "Upload a CSV with faculty details and department assignments.",
    hints: ["Required: name, email", "Optional: department_name"],
    sampleCsv: `name,email,department_name
Dr. Robert Smith,robert.smith@example.com,Computer Science
Prof. Sarah Connor,sarah.connor@example.com,Information Technology
Dr. James Wilson,james.wilson@example.com,Mechanical Engineering`,
  },
  subjects: {
    title: "Import Subjects",
    description: "Upload a CSV with subjects and optional program mapping.",
    hints: ["Required: name, code", "Optional: semester, program_name, credits, subject_type (THEORY, LAB, ELECTIVE)"],
    sampleCsv: `name,code,semester,program_name,credits,subject_type
Data Structures,CS201,3,Computer Science,4,THEORY
Operating Systems,CS301,5,Computer Science,4,LAB`,
  },
  "faculty-subjects": {
    title: "Import Faculty Subject Mapping",
    description: "Upload a CSV where each row assigns a faculty member to a subject.",
    hints: ["Required: faculty_email or faculty_name", "Required: subject_code or subject_name"],
    sampleCsv: `faculty_email,subject_code
robert.smith@example.com,CS201
sarah.connor@example.com,CS301`,
  },
  parents: {
    title: "Import Parents",
    description: "Upload a CSV with parent account details.",
    hints: ["Required: name, email", "Optional: phone"],
    sampleCsv: `name,email,phone
Michael Doe,michael.doe@example.com,+1234567890
Mary Smith,mary.smith@example.com,+1234567891`,
  },
  timetable: {
    title: "Import Timetable",
    description: "Upload a CSV with timetable slots for sections.",
    hints: ["Required: day, period, section_name, subject_code", "Optional: semester, faculty_email"],
    sampleCsv: `day,period,section_name,subject_code,faculty_email
Monday,1,Section A,CS201,robert.smith@example.com
Monday,2,Section A,CS301,sarah.connor@example.com`,
  },
}

export function BulkImportDialog({ open, onOpenChange, entity, institutionId, onImported }: BulkImportDialogProps) {
  const [rows, setRows] = useState<Record<string, string | undefined>[]>([])
  const [fileName, setFileName] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const meta = ENTITY_META[entity]

  useEffect(() => {
    if (!open) {
      setRows([])
      setFileName("")
      setError(null)
      setIsImporting(false)
    }
  }, [open])

  const previewCount = useMemo(() => rows.length, [rows])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = normalizeImportRows(parseCsvText(text))
      setRows(parsed)
      setFileName(file.name)
      setError(null)
    } catch (error) {
      setRows([])
      setFileName("")
      setError(error instanceof Error ? error.message : "Unable to parse CSV file")
    }
  }

  async function handleImport() {
    if (!rows.length) {
      setError("Please choose a CSV file with at least one row.")
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const response = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, institution_id: institutionId, rows }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Bulk import failed")
      }

      toast({
        title: "Import complete",
        description: `${data.createdCount ?? rows.length} record${(data.createdCount ?? rows.length) === 1 ? "" : "s"} imported successfully.`,
      })
      onImported?.()
      onOpenChange(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Bulk import failed")
    } finally {
      setIsImporting(false)
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([meta.sampleCsv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${entity}-sample.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Upload CSV</p>
              <p className="text-xs text-slate-500">Accepted format: .csv</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs h-8 gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Sample CSV
            </Button>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50">
            <FileText className="mb-2 h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Choose CSV file</span>
            <span className="mt-1 text-xs text-slate-500">{fileName || "No file selected"}</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Preview</p>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
              {previewCount > 0 ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{previewCount} row{previewCount === 1 ? "" : "s"} ready to import</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>Select a CSV file to begin</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">Helpful headers</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              {meta.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || previewCount === 0}>
            {isImporting ? "Importing…" : "Import CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
