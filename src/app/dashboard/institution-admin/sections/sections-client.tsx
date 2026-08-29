"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SectionsList } from "@/components/sections/sections-list"
import { CreateSectionDialog } from "@/components/sections/create-section-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import type { Section, SectionWithFacultyAdvisor, CreateSectionInput } from "@/modules/sections"
import { Plus } from "lucide-react"

interface SectionsClientPageProps {
  initialSections: SectionWithFacultyAdvisor[]
  programs: Array<{ id: string; name: string }>
  facultyAdvisors: Array<{ id: string; name: string; email: string }>
  institutionId: string
}

export function SectionsClientPage({
  initialSections,
  programs,
  facultyAdvisors,
  institutionId,
}: SectionsClientPageProps) {
  const [sections, setSections] = useState<SectionWithFacultyAdvisor[]>(initialSections)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const handleCreateSection = async (data: CreateSectionInput) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          institution_id: institutionId,
        }),
      })

      if (!response.ok) throw new Error("Failed to create section")

      const newSection = await response.json()
      setSections([...sections, newSection])
      setIsOpen(false)
      setSelectedSection(null)

      toast({
        title: "Success",
        description: "Section created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create section",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSection = async (data: CreateSectionInput) => {
    if (!selectedSection) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/sections/${selectedSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update section")

      const updated = await response.json()
      setSections(sections.map((s) => (s.id === selectedSection.id ? updated : s)))
      setIsOpen(false)
      setSelectedSection(null)

      toast({
        title: "Success",
        description: "Section updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update section",
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
      const response = await fetch(`/api/sections/${deleteId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete section")

      setSections(sections.filter((s) => s.id !== deleteId))
      setDeleteOpen(false)
      setDeleteId(null)

      toast({
        title: "Success",
        description: "Section deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete section",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (section?: SectionWithFacultyAdvisor) => {
    if (section) {
      setSelectedSection(section)
    } else {
      setSelectedSection(null)
    }
    setIsOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sections</h1>
          <p className="text-gray-600 mt-1">Manage sections and faculty advisors</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Section
        </Button>
      </div>

      <Card className="p-6">
        <SectionsList
          sections={sections}
          isLoading={isLoading}
          onEdit={handleOpenDialog}
          onDelete={triggerDelete}
        />
      </Card>

      <CreateSectionDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={selectedSection ? handleEditSection : handleCreateSection}
        section={selectedSection}
        programs={programs}
        facultyAdvisors={facultyAdvisors}
        isLoading={isLoading}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Section"
        description="Are you sure you want to delete this class section? Students assigned to this section will lose their section registration."
        loading={isLoading}
      />
    </div>
  )
}
