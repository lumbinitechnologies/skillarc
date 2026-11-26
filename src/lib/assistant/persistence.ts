import type { SupabaseClient } from "@supabase/supabase-js"

import { createAssistantDataClient } from "@/lib/assistant/server-client"
import type { AssistantPrincipal, AssistantUIMessage, SourceCitation } from "@/lib/assistant/types"

type AssistantThreadSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

function scopedThreadsQuery(client: SupabaseClient, principal: AssistantPrincipal) {
  let query = client
    .from("assistant_threads")
    .select("id, title, created_at, updated_at")
    .eq("user_id", principal.userId)
    .eq("actor_user_id", principal.actorUserId)
    .eq("role", principal.role)

  query = principal.organizationId ? query.eq("organization_id", principal.organizationId) : query.is("organization_id", null)
  query = principal.institutionId ? query.eq("institution_id", principal.institutionId) : query.is("institution_id", null)
  query = principal.departmentId ? query.eq("department_id", principal.departmentId) : query.is("department_id", null)
  return query
}

function scopedThreadQuery(client: SupabaseClient, principal: AssistantPrincipal, threadId: string) {
  return scopedThreadsQuery(client, principal).eq("id", threadId).maybeSingle()
}

export async function createOrVerifyThread(
  principal: AssistantPrincipal,
  requestedThreadId?: string,
): Promise<{ client: SupabaseClient; threadId: string; history: AssistantUIMessage[] }> {
  const client = await createAssistantDataClient(principal)
  const threadId = requestedThreadId ?? crypto.randomUUID()

  if (requestedThreadId) {
    const { data, error } = await scopedThreadQuery(client, principal, threadId)
    if (error) throw new Error("Assistant thread storage is unavailable")
    if (!data) {
      // The client may generate a fresh UUID before the first turn. It is safe
      // to claim only a thread that does not already exist; existing threads
      // must pass the explicit principal ownership predicates above.
      const { error: createError } = await client.from("assistant_threads").insert({
        id: threadId,
        user_id: principal.userId,
        actor_user_id: principal.actorUserId,
        organization_id: principal.organizationId,
        institution_id: principal.institutionId,
        department_id: principal.departmentId,
        role: principal.role,
      })
      if (createError) throw new Error("Assistant thread storage is unavailable")
    }
  } else {
    const { error } = await client.from("assistant_threads").insert({
      id: threadId,
      user_id: principal.userId,
      actor_user_id: principal.actorUserId,
      organization_id: principal.organizationId,
      institution_id: principal.institutionId,
      department_id: principal.departmentId,
      role: principal.role,
    })
    if (error) throw new Error("Assistant thread storage is unavailable")
  }

  const { data, error } = await client
    .from("assistant_messages")
    .select("message")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(40)
  if (error) throw new Error("Assistant message storage is unavailable")

  return {
    client,
    threadId,
    history: (data ?? [])
      .map((row) => row.message as AssistantUIMessage)
      .filter((message) => message && ["user", "assistant"].includes(message.role)),
  }
}

export async function listAssistantThreads(
  principal: AssistantPrincipal,
  limit = 30,
): Promise<AssistantThreadSummary[]> {
  const client = await createAssistantDataClient(principal)
  const { data: threads, error } = await scopedThreadsQuery(client, principal)
    .order("updated_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50))
  if (error) throw new Error("Assistant thread storage is unavailable")
  if (!threads?.length) return []

  const threadIds = threads.map((thread) => thread.id)
  const { data: userMessages, error: messagesError } = await client
    .from("assistant_messages")
    .select("thread_id, content, created_at")
    .in("thread_id", threadIds)
    .eq("role", "user")
    .order("created_at", { ascending: true })
  if (messagesError) throw new Error("Assistant message storage is unavailable")

  const firstMessageByThread = new Map<string, string>()
  for (const message of userMessages ?? []) {
    if (!firstMessageByThread.has(message.thread_id)) firstMessageByThread.set(message.thread_id, message.content)
  }

  return threads.map((thread) => ({
    id: thread.id,
    title: (thread.title || firstMessageByThread.get(thread.id) || "New conversation").trim().slice(0, 72),
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
  }))
}

export async function getAssistantThread(
  principal: AssistantPrincipal,
  threadId: string,
): Promise<AssistantUIMessage[] | null> {
  const client = await createAssistantDataClient(principal)
  const { data: thread, error: threadError } = await scopedThreadQuery(client, principal, threadId)
  if (threadError) throw new Error("Assistant thread storage is unavailable")
  if (!thread) return null

  const { data: messages, error } = await client
    .from("assistant_messages")
    .select("message")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(40)
  if (error) throw new Error("Assistant message storage is unavailable")

  return (messages ?? [])
    .map((row) => row.message as AssistantUIMessage)
    .filter((message) => message && ["user", "assistant"].includes(message.role))
}

export async function findStoredTurn(
  client: SupabaseClient,
  threadId: string,
  clientTurnId: string,
): Promise<AssistantUIMessage | null> {
  const { data, error } = await client
    .from("assistant_messages")
    .select("message, role")
    .eq("thread_id", threadId)
    .eq("client_turn_id", clientTurnId)
    .eq("role", "assistant")
    .maybeSingle()
  if (error) throw new Error("Assistant idempotency storage is unavailable")
  return (data?.message as AssistantUIMessage | undefined) ?? null
}

export async function hasStoredUserTurn(
  client: SupabaseClient,
  threadId: string,
  clientTurnId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("assistant_messages")
    .select("id")
    .eq("thread_id", threadId)
    .eq("client_turn_id", clientTurnId)
    .eq("role", "user")
    .maybeSingle()
  if (error) throw new Error("Assistant idempotency storage is unavailable")
  return Boolean(data)
}

/** Release an unfinished idempotency marker after cancellation or timeout. */
export async function deleteStoredUserTurn(
  client: SupabaseClient,
  threadId: string,
  messageId: string,
  clientTurnId: string,
) {
  const { error } = await client
    .from("assistant_messages")
    .delete()
    .eq("thread_id", threadId)
    .eq("id", messageId)
    .eq("client_turn_id", clientTurnId)
    .eq("role", "user")
  if (error) throw new Error("Assistant idempotency cleanup failed")
}

export async function persistMessage(
  client: SupabaseClient,
  threadId: string,
  message: AssistantUIMessage,
  clientTurnId: string,
) {
  const text = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .slice(0, 20000)
  const { error } = await client.from("assistant_messages").insert({
    id: message.id,
    thread_id: threadId,
    role: message.role,
    content: text,
    message,
    client_turn_id: clientTurnId,
  })
  if (error) throw new Error("Assistant message persistence failed")

  const { error: threadError } = await client
    .from("assistant_threads")
    .update({
      title: message.role === "user" && text ? text.slice(0, 72) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
  if (threadError) throw new Error("Assistant thread persistence failed")
}

export async function persistSources(
  client: SupabaseClient,
  messageId: string,
  sources: SourceCitation[],
) {
  if (!sources.length) return
  const { error } = await client.from("assistant_message_sources").insert(
    sources.map((source) => ({
      message_id: messageId,
      source_type: source.sourceType,
      title: source.title,
      href: source.href ?? null,
      snippet: source.snippet ?? null,
      document_id: source.documentId ?? null,
      chunk_index: source.chunkIndex ?? null,
      score: source.score ?? null,
    })),
  )
  if (error) throw new Error("Assistant source persistence failed")
}

export async function persistToolRuns(
  client: SupabaseClient,
  threadId: string,
  messageId: string | null,
  toolNames: string[],
) {
  if (!toolNames.length) return
  const { error } = await client.from("assistant_tool_runs").insert(
    toolNames.map((toolName) => ({
      thread_id: threadId,
      message_id: messageId,
      tool_name: toolName,
      input_metadata: {},
      output_metadata: {},
      status: "completed",
    })),
  )
  if (error) throw new Error("Assistant tool-run persistence failed")
}
