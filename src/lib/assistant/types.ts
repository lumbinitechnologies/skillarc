import type { UIMessage } from "ai"

import type { UserRole } from "@/constants/roles"

export type AssistantPrincipal = {
  userId: string
  actorUserId: string
  organizationId: string | null
  institutionId: string | null
  departmentId: string | null
  role: UserRole
  isImpersonating: boolean
}

export type SourceCitation = {
  id: string
  title: string
  sourceType: "dashboard" | "document" | "workflow"
  snippet?: string
  href?: string
  documentId?: string
  chunkIndex?: number
  score?: number
}

export type WorkflowStep = {
  title: string
  description: string
  href?: string
}

export type WorkflowDefinition = {
  id: string
  title: string
  roles: UserRole[]
  keywords: string[]
  prerequisites: string[]
  steps: WorkflowStep[]
  relatedRoutes: string[]
}

export type AssistantData = {
  sources: SourceCitation[]
  workflow: WorkflowDefinition | null
  navigation: { label: string; href: string }[]
}

export type AssistantUIMessage = UIMessage<unknown, AssistantData>

export type AssistantReadResult = {
  context: string | null
  sources: SourceCitation[]
}
