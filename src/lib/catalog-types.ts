import type { TableRow } from "./database-row"
export interface CatalogProgram { id: string; name: string; department_id: string; department?: { id: string; name: string } | null }
export type CatalogSubject = Pick<TableRow<"subjects">, "id" | "name" | "code" | "program_id" | "semester" | "credits" | "subject_type"> & { program?: { id: string; name: string; department_id?: string; department?: { id: string; name: string } | null } | null }
export interface SubjectFormValues { department_id?: string; program_id?: string | null; program_ids?: string[]; semester: number; name: string; code: string; credits: number; subject_type: string }
