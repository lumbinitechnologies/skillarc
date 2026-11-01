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
  entity: "students" | "faculty" | "subjects" | "faculty-subjects" | "parents" | "timetable" | "departments" | "programs" | "sections"
  institutionId: string
  onImported?: () => void
}

const ENTITY_META: Record<BulkImportDialogProps["entity"], { title: string; description: string; hints: string[]; sampleCsv: string }> = {
  students: {
    title: "Import Students",
    description: "Upload a CSV with student details, section assignments, and optional parent/guardian details.",
    hints: [
      "Mandatory (*): name, email",
      "Optional Student: section_name, semester, program_name, registration_number, phone, admission_year, dob, gender",
      "Optional Guardian: parent_name, parent_email, parent_phone, parent_relationship (Father, Mother, Guardian, Other)",
    ],
    sampleCsv: `name,email,section_name,semester,program_name,registration_number,phone,admission_year,dob,gender,parent_name,parent_email,parent_phone,parent_relationship
Aarav Sharma,iskalasailajatest3@gmail.com,Section A,1,B.Tech IT,REG-IT-001,+919876543210,2024,2006-03-15,Male,Rajesh Sharma,iskalasailajatest4@gmail.com,+919876543220,Father
Vihaan Verma,vihaan.verma@example.com,Section A,1,B.Tech IT,REG-IT-002,+919876543212,2024,2005-11-09,Male,Suresh Verma,suresh.verma@example.com,+919876543222,Guardian
Diya Patel,diya.patel@example.com,cse *a,1,CSE*,REG-CSE-001,+919876543211,2024,2006-07-22,Female,Anita Patel,anita.patel@example.com,+919876543221,Mother
Rohan Gupta,rohan.gupta@example.com,cse *a,1,CSE*,REG-CSE-002,+919876543213,2024,2006-01-10,Male,Rajesh Sharma,rajesh.sharma@example.com,+919876543220,Father
Ananya Iyer,ananya.iyer@example.com,Section B,1,B.tech Cse (core),REG-CS-001,+919876543214,2024,2006-09-05,Female,Anita Patel,anita.patel@example.com,+919876543221,Mother`,
  },
  faculty: {
    title: "Import Faculty",
    description: "Upload a CSV with faculty details, department assignments, roles, and builder permissions.",
    hints: [
      "Mandatory (*): name, email",
      "Optional: department_name, phone, employee_id, role (FACULTY, HOD, PROGRAM_HEAD), is_timetable_builder (true/false)",
    ],
    sampleCsv: `name,email,department_name,phone,employee_id,role,is_timetable_builder
Dr. Alan Turing,alan.turing@example.com,CSE,+919876543201,FAC101,FACULTY,true
Prof. Ada Lovelace,ada.lovelace@example.com,CSE,+919876543202,HOD,false
Dr. Sailaja Iskala,iskalasailajatest5@gmail.com,Information Technology,+919876543203,FAC103,FACULTY,false`,
  },
  subjects: {
    title: "Import Subjects",
    description: "Upload a CSV with subjects and curriculum mapping.",
    hints: [
      "Mandatory (*): name, code",
      "Optional: semester, program_name, credits, subject_type (THEORY, LAB, ELECTIVE)",
    ],
    sampleCsv: `name,code,semester,program_name,credits,subject_type
Database Management Systems,CS202,3,CSE*,4,THEORY
Computer Networks,CS203,3,CSE*,4,THEORY
Data Structures Lab,CS204,3,CSE*,2,LAB
Web Technologies,IT201,3,B.Tech IT,4,THEORY
Web Technologies Lab,IT202,3,B.Tech IT,2,LAB
Operating Systems,IT203,4,B.Tech IT,4,THEORY
Information & Network Security,IT302,5,B.Tech IT,3,THEORY
Cloud Computing & DevOps,IT303,5,B.Tech IT,3,ELECTIVE`,
  },
  "faculty-subjects": {
    title: "Assign Courses to Faculty",
    description: "Upload a CSV mapping faculty members to courses.",
    hints: [
      "Required (*): faculty_name (or faculty_email), subject_code (or subject_name)",
      "Optional: section_name, semester, academic_year",
    ],
    sampleCsv: `faculty_name,subject_code,subject_name
Dr. Sailaja Iskala,IT201,Web Technologies
Dr. Sailaja Iskala,IT302,Information & Network Security
Prof. Ada Lovelace,CS202,Database Management Systems
Prof. Grace Hopper,CS203,Computer Networks
Dr. Alan Turing,t101,data structures`,
  },
  parents: {
    title: "Import Parents",
    description: "Upload a CSV with parent details and optional student linking.",
    hints: [
      "Mandatory (*): name, email",
      "Optional: phone, student_email, student_registration_number, relationship (Father, Mother, Guardian, Other)",
    ],
    sampleCsv: `name,email,phone,student_email,student_registration_number,relationship
Rajesh Sharma,rajesh.sharma@example.com,+919876543220,aarav.sharma@example.com,REG2024001,Father
Anita Patel,anita.patel@example.com,+919876543221,diya.patel@example.com,REG2024002,Mother`,
  },
  timetable: {
    title: "Import Timetable",
    description: "Upload a CSV with timetable slots for sections. Use department_name and program_name to disambiguate sections that share the same name across programs.",
    hints: [
      "Mandatory (*): day, period, section_name, subject_code (or subject_name)",
      "Recommended: department_name, program_name, semester (to uniquely identify the section)",
      "Optional: faculty_email (or faculty_name), room",
    ],
    sampleCsv: `day,period,section_name,subject_code,faculty_email,semester,department_name,program_name,room
Monday,1,Section A,IT201,iskalasailajatest5@gmail.com,1,Information Technology,B.Tech IT,Lab 101
Monday,2,Section A,IT202,,1,Information Technology,B.Tech IT,Lab 101
Monday,3,Section A,IT203,,1,Information Technology,B.Tech IT,Room 204
Tuesday,1,Section A,IT302,iskalasailajatest5@gmail.com,1,Information Technology,B.Tech IT,Room 204
Tuesday,2,Section A,IT303,,1,Information Technology,B.Tech IT,Lab 102
Monday,1,cse *a,t101,alan.turing@example.com,1,CSE,CSE*,Room 301
Monday,2,cse *a,CS202,ada.lovelace@example.com,1,CSE,CSE*,Room 301
Monday,3,cse *a,CS203,grace.hopper.test@example.com,1,CSE,CSE*,Room 302
Tuesday,1,cse *a,CS204,grace.hopper.test@example.com,1,CSE,CSE*,Lab 201
Wednesday,1,Section B,CS202,ada.lovelace@example.com,1,Computer Science,B.tech Cse (core),Room 105`,
  },
  departments: {
    title: "Import Departments",
    description: "Upload a CSV to bulk create departments. Existing departments (matched by name) are skipped.",
    hints: [
      "Mandatory (*): name",
      "Tip: one department per row, name must be unique within the institution",
    ],
    sampleCsv: `name
Computer Science
Information Technology
Electronics and Communication
Mechanical Engineering
Civil Engineering`,
  },
  programs: {
    title: "Import Programs",
    description: "Upload a CSV to bulk create academic programs and optionally link them to departments.",
    hints: [
      "Mandatory (*): name",
      "Optional: department_name (must match an existing department exactly or partially)",
      "Note: if a program already exists, its department will be updated if department_name is provided",
    ],
    sampleCsv: `name,department_name
B.Tech AI & ML,Computer Science
B.Tech Cyber Security,Computer Science
B.Tech CSE (Core),Computer Science
B.Tech Automobile Engineering,Mechanical Engineering
B.Tech Civil Engineering,Civil Engineering
BCA,Computer Science
MCA,Computer Science`,
  },
  sections: {
    title: "Import Sections",
    description: "Upload a CSV to bulk create sections and assign them to programs. Use department_name to disambiguate programs with the same name.",
    hints: [
      "Mandatory (*): name, semester, program_name",
      "Optional: department_name (narrows program lookup), faculty_advisor_email",
      "Note: duplicate sections (same name + semester + program) are skipped",
    ],
    sampleCsv: `name,semester,program_name,department_name,faculty_advisor_email
Section A,1,B.Tech CSE,Computer Science,
Section B,1,B.Tech CSE,Computer Science,
Section A,2,B.Tech CSE,Computer Science,
Section A,1,B.Tech IT,Information Technology,
Section A,1,BCA,Computer Science,`,
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

      const importedCount = data.createdCount ?? rows.length
      const warningText = data.warnings?.length
        ? `\n⚠️ ${data.warnings.join(" | ")}`
        : ""

      toast({
        title: "Import complete",
        description: `${importedCount} record${importedCount === 1 ? "" : "s"} imported successfully.${warningText}`,
      })

      if (data.warnings?.length) {
        setError(`⚠️ Partial import: ${data.warnings.join(" | ")}`)
        // Don't close dialog so user can read the warnings
        onImported?.()
        return
      }

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
