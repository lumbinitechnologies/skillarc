"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ParentList } from "@/components/parents/parent-list"
import { CreateParentDialog } from "@/components/parents/create-parent-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import type { Parent, CreateParentInput, UpdateParentInput } from "@/modules/parents"

interface ParentsClientPageProps {
  initialParents: Parent[]
  institutionId: string
}

export function ParentsClientPage({ initialParents, institutionId }: ParentsClientPageProps) {
  const [parents, setParents] = useState<Parent[]>(initialParents)
  const [isOpen, setIsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const loadParents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/parents?institution_id=${institutionId}`)
      if (!response.ok) throw new Error("Failed to load parents")
      const data = await response.json()
      setParents(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load parents",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOrUpdate = async (
    data: CreateParentInput | UpdateParentInput,
    isEdit: boolean
  ) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        isEdit ? `/api/parents/${selectedParent?.id}` : "/api/parents",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            institution_id: institutionId,
          }),
        }
      )

      if (!response.ok) throw new Error(isEdit ? "Failed to update parent" : "Failed to create parent")

      await loadParents()
      setIsOpen(false)
      setSelectedParent(null)
      toast({
        title: "Success",
        description: isEdit ? "Parent updated successfully" : "Parent created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Operation failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerDelete = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/parents/${deleteId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete parent")
      await loadParents()
      setDeleteOpen(false)
      setDeleteId(null)
      toast({
        title: "Success",
        description: "Parent removed successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete parent",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parents</h1>
          <p className="text-gray-600 mt-1">Manage parent accounts and assign parent access.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>Import CSV</Button>
          <Button onClick={() => setIsOpen(true)}>New Parent</Button>
        </div>
      </div>

      <Card className="p-6">
        <ParentList
          parents={parents}
          isLoading={isLoading}
          onEdit={(parent) => {
            setSelectedParent(parent)
            setIsOpen(true)
          }}
          onDelete={triggerDelete}
        />
      </Card>

      <CreateParentDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setSelectedParent(null)
        }}
        onSubmit={handleCreateOrUpdate}
        onRelationsChanged={loadParents}
        parent={selectedParent}
        isLoading={isLoading}
      />

      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="parents"
        institutionId={institutionId}
        onImported={() => loadParents()}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Parent Account"
        description="Are you sure you want to delete this parent account? The student link relations will be unlinked."
        loading={isLoading}
      />
    </div>
  )
}
