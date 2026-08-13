"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Department {
  id: string
  name: string
}

interface Props {
  initialDepartments: Department[]
  institutionId: string
}

export function DepartmentsClientPage({
  initialDepartments,
  institutionId,
}: Props) {
  const [departments, setDepartments] = useState(initialDepartments)
  const [name, setName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const loadDepartments = async () => {
    const res = await fetch(`/api/departments?institution_id=${institutionId}`)
    const data = await res.json()
    setDepartments(data)
  }

  const createDepartment = async () => {
    if (!name.trim()) {
      alert("Please enter a department name.")
      return
    }

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          institution_id: institutionId,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setName("")
        await loadDepartments()
      } else {
        console.error("Failed to create department:", data.error)
        alert(`Error creating department: ${data.error || "Failed to create"}`)
      }
    } catch (err: any) {
      console.error("Request error:", err)
      alert(`Request failed: ${err.message || "Unknown error"}`)
    }
  }

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete department?")) return

    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        await loadDepartments()
      } else {
        alert(`Error deleting department: ${data.error || "Failed to delete"}`)
      }
    } catch (err: any) {
      console.error("Delete error:", err)
      alert(`Request failed: ${err.message || "Unknown error"}`)
    }
  }

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">
              Institution Structure
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">Departments</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-[#6C63FF]">
                {departments.length} Total
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Create and manage academic departments with a cleaner, more consistent workspace.
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add a new department</h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep the institution catalog organized by department.
            </p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Department name"
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:bg-white"
            />
            <Button
              onClick={createDepartment}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search departments"
              className="w-full rounded-xl bg-white px-9 py-2.5 text-sm text-slate-700 outline-none transition focus:bg-white"
            />
          </div>
          <p className="text-sm text-slate-500">
            {filteredDepartments.length} visible
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="px-4 py-3">Department</TableHead>
                <TableHead className="w-24 px-4 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="px-4 py-10 text-center text-sm text-slate-500">
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((dept) => (
                  <TableRow key={dept.id} className="!border-0 hover:bg-slate-50/70">
                    <TableCell className="px-4 py-3 font-medium text-slate-800">
                      <Link
                        href={`/dashboard/institution-admin/departments/${dept.id}`}
                        className="text-[#6C63FF] hover:text-[#8B5CF6] transition-colors hover:underline"
                      >
                        {dept.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDepartment(dept.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}