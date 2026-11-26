"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { Section } from "@/modules/sections"

interface SectionContextType {
  sections: Section[]
  setSections: (sections: Section[]) => void
  selectedSectionId: string | null
  setSelectedSectionId: (id: string | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  refreshSections: () => void
}

const SectionContext = createContext<SectionContextType | undefined>(undefined)

export function SectionProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSections = useCallback(() => {
    setIsLoading(true)
  }, [])

  return (
    <SectionContext.Provider
      value={{
        sections,
        setSections,
        selectedSectionId,
        setSelectedSectionId,
        isLoading,
        setIsLoading,
        error,
        setError,
        refreshSections,
      }}
    >
      {children}
    </SectionContext.Provider>
  )
}

export function useSectionContext() {
  const context = useContext(SectionContext)
  if (!context) {
    throw new Error("useSectionContext must be used within SectionProvider")
  }
  return context
}
