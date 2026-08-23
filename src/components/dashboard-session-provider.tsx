"use client"

import { createContext, useContext } from "react"
import type { UserContext } from "@/lib/user-context"

const DashboardSessionContext = createContext<UserContext | null>(null)

export function DashboardSessionProvider({
  value,
  children,
}: {
  value: UserContext | null
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
