"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Parent } from "@/modules/parents"
import { Trash2, Edit2, UserPlus } from "lucide-react"

interface ParentListProps {
  parents: Parent[]
  isLoading?: boolean
  onEdit?: (parent: Parent) => void
  onDelete?: (parentId: string) => void
}

export function ParentList({
  parents,
  isLoading = false,
  onEdit,
  onDelete,
}: ParentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!parents || parents.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <p>No parents found. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {parents.map((parent) => (
        <Card key={parent.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{parent.name}</h3>
              <p className="text-sm text-gray-600">{parent.email}</p>
            </div>
            <Badge variant="outline">Parent</Badge>
          </div>

          <div className="space-y-2 mb-4 text-sm text-gray-600">
            <div className="mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Linked Students</span>
              {(parent as any).students && (parent as any).students.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(parent as any).students.map((stud: any) => (
                    <Badge key={stud.id} variant="secondary" className="px-2.5 py-1 bg-indigo-50 text-[#6C63FF] border border-indigo-100 rounded-full text-xs font-semibold">
                      {stud.name} ({stud.registration_number || "No USN"}) · {stud.relationship}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1 italic">No students linked to this parent account.</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(parent)}
              className="flex-1"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(parent.id)}
              className="text-red-600 hover:text-red-700 flex-1"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
