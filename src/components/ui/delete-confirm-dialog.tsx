"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  loading?: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete Record",
  description = "Are you sure you want to delete this record? This action cannot be undone.",
  loading = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-sm font-bold text-slate-900 tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2 font-semibold leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 text-xs font-bold text-slate-600 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 outline-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 h-11 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 flex items-center justify-center border-none outline-none disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
