"use client"

import { createContext, useContext } from "react"
import type { DashboardSession } from "@/lib/dashboard-session"

const DashboardSessionContext = createContext<DashboardSession | null>(null)

export function DashboardSessionProvider({
  value,
  children,
}: {
  value: DashboardSession | null
  children: React.ReactNode
}) {
  return (
    <DashboardSessionContext.Provider value={value}>
      {children}
    </DashboardSessionContext.Provider>
  )
}

export function useDashboardSession() {
  return useContext(DashboardSessionContext)
}
