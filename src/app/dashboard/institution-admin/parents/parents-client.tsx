"use client"

import { useState, useCallback } from "react"
import { Users } from "lucide-react"
import { ParentList } from "@/components/parents/parent-list"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { PageShell, PageHeader, SearchBar, itemVariants } from "@/components/ui/page-shell"
import { motion } from "framer-motion"
import type { Parent } from "@/modules/parents"

interface ParentsClientPageProps {
  initialParents: Parent[]
  institutionId: string
}

export function ParentsClientPage({ initialParents, institutionId }: ParentsClientPageProps) {
  const [parents, setParents] = useState<Parent[]>(initialParents)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const loadParents = useCallback(async () => {
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
  }, [institutionId, toast])

  const triggerDelete = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/parents/${deleteId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete parent")
      await loadParents()
      setDeleteOpen(false)
      setDeleteId(null)
      toast({ title: "Success", description: "Parent account removed successfully" })
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

  const filtered = parents.filter((p) =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell>
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        eyebrow="Parent & Guardian Registry"
        title="Parents"
        count={parents.length}
        countLabel="Accounts"
        subtitle="Parent accounts are created automatically when enrolling a student."
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email…"
      />

      {/* Info banner */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl border border-amber-100/80 bg-amber-50/60 px-5 py-3.5 flex items-start gap-3">
          <span className="text-amber-500 mt-0.5 shrink-0">ℹ️</span>
          <p className="text-sm text-amber-800">
            To add a new parent, go to{" "}
            <span className="font-semibold">Students → New Student</span>{" "}
            and fill in guardian details in Step 3. The parent account will be created and linked automatically.
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ParentList
          parents={filtered}
          isLoading={isLoading}
          onDelete={triggerDelete}
          onRefresh={loadParents}
        />
      </motion.div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Remove Parent Account"
        description="Are you sure? This will remove the parent account and unlink all associated students. The students will not be affected."
        loading={isLoading}
      />
    </PageShell>
  )
}
