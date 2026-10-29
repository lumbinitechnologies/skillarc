'use client'

/**
 * org-type-context.tsx
 *
 * React context that makes org terminology available to any client component
 * inside the dashboard without prop-drilling.
 *
 * Setup (dashboard layout):
 *   <OrgTypeProvider type={orgType}>
 *     {children}
 *   </OrgTypeProvider>
 *
 * In any component:
 *   const label = useTerm('faculty_plural')   // 'Faculty' or 'Teachers'
 *   const orgType = useOrgType()              // 'college' | 'school'
 */

import { createContext, useContext } from 'react'
import type { OrgType, TerminologyMap } from './org-terminology'
import { getTerm, TERMINOLOGY } from './org-terminology'

// ─── Context ──────────────────────────────────────────────────────────────────

const OrgTypeContext = createContext<OrgType>('college')

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrgTypeProvider({
  type,
  children,
}: {
  type: OrgType
  children: React.ReactNode
}) {
  return (
    <OrgTypeContext.Provider value={type}>
      {children}
    </OrgTypeContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns the current org type: 'college' | 'school' */
export function useOrgType(): OrgType {
  return useContext(OrgTypeContext)
}

/**
 * Returns a single translated term for the current org type.
 *
 * @example
 * const label = useTerm('faculty_plural') // 'Faculty' or 'Teachers'
 */
export function useTerm(key: keyof TerminologyMap): string {
  const orgType = useOrgType()
  return getTerm(orgType, key)
}

/**
 * Returns the full terminology map for the current org type.
 * Use this when you need multiple terms at once to avoid multiple hook calls.
 *
 * @example
 * const t = useTerms()
 * // t.faculty_plural, t.department, t.semester ...
 */
export function useTerms(): TerminologyMap {
  const orgType = useOrgType()
  return TERMINOLOGY[orgType]
}

/**
 * Utility: returns true if the current org is a school.
 * Useful for conditionally rendering school-specific UI sections.
 *
 * @example
 * const isSchool = useIsSchool()
 * {isSchool && <BehaviorTrackingTab />}
 */
export function useIsSchool(): boolean {
  return useOrgType() === 'school'
}
