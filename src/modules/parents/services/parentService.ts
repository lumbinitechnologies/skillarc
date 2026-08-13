import type { Parent, CreateParentInput, UpdateParentInput } from "../types/parent.types"

export type ParentRecord = Parent

export async function getParents(): Promise<Parent[]> {
  return []
}

export async function getParentById(_id: string): Promise<Parent | null> {
  return null
}

export async function createParent(_data: CreateParentInput): Promise<Parent> {
  return { id: _data.email ?? "temp", name: _data.name, email: _data.email, institution_id: _data.institution_id, organization_id: _data.organization_id } as Parent
}

export async function updateParent(_id: string, _data: UpdateParentInput): Promise<Parent | null> {
  return null
}
