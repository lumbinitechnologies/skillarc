import assert from "node:assert/strict"
import test from "node:test"
import { cascadeDeleteInstitution, cascadeDeleteOrganization } from "./cascade-delete"

test("cascadeDeleteInstitution handles non-existent mock client gracefully via parallel fallback", async () => {
  const deletedTables: string[] = []
  const updatedTables: string[] = []

  const mockClient: any = {
    from: (tableName: string) => {
      return {
        select: () => ({
          eq: async () => ({ data: [] }),
          in: async () => ({ data: [] }),
          or: async () => ({ data: [] }),
        }),
        update: () => ({
          eq: async () => {
            updatedTables.push(tableName)
            return { error: null }
          },
          in: async () => {
            updatedTables.push(tableName)
            return { error: null }
          },
        }),
        delete: () => ({
          eq: async () => {
            deletedTables.push(tableName)
            return { error: null }
          },
          in: async () => {
            deletedTables.push(tableName)
            return { error: null }
          },
        }),
      }
    },
    auth: {
      admin: {
        deleteUser: async () => ({ data: {}, error: null }),
      },
    },
  }

  const result = await cascadeDeleteInstitution(mockClient, "test-inst-123")
  assert.equal(result.success, true)
  assert.ok(deletedTables.includes("institutions"))
})

test("cascadeDeleteOrganization handles deletion sequence via fallback", async () => {
  const deletedTables: string[] = []

  const mockClient: any = {
    from: (tableName: string) => {
      return {
        select: () => ({
          eq: async () => {
            if (tableName === "institutions") return { data: [{ id: "inst-1" }] }
            if (tableName === "users") return { data: [{ id: "user-1" }] }
            return { data: [] }
          },
          in: async () => ({ data: [] }),
          or: async () => ({ data: [] }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
          in: async () => ({ error: null }),
        }),
        delete: () => ({
          eq: async () => {
            deletedTables.push(tableName)
            return { error: null }
          },
          in: async () => {
            deletedTables.push(tableName)
            return { error: null }
          },
        }),
      }
    },
    auth: {
      admin: {
        deleteUser: async () => ({ data: {}, error: null }),
      },
    },
  }

  const result = await cascadeDeleteOrganization(mockClient, "test-org-123")
  assert.equal(result.success, true)
  assert.ok(deletedTables.includes("institutions"))
  assert.ok(deletedTables.includes("organizations"))
})

test("cascadeDeleteInstitution uses RPC fast-path when available", async () => {
  let rpcCalled = false
  const mockClient: any = {
    rpc: async (name: string) => {
      if (name === "delete_institution_cascade") {
        rpcCalled = true
        return { error: null }
      }
      return { error: new Error("not found") }
    },
    from: () => ({
      select: () => ({
        eq: async () => ({ data: [{ id: "user-1" }] }),
      }),
    }),
    auth: {
      admin: {
        deleteUser: async () => ({ data: {}, error: null }),
      },
    },
  }

  const result = await cascadeDeleteInstitution(mockClient, "test-inst-rpc")
  assert.equal(result.success, true)
  assert.equal(rpcCalled, true)
})
