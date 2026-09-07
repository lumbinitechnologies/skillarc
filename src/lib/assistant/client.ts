import type {
  AssistantTask,
  CommunicationFeedback,
  InterviewEvaluation,
  InterviewQuestion,
  InterviewReport,
  PlacementAnalytics,
  PlacementExplanation,
  TeamSuggestion,
} from "@/lib/assistant/tasks"

export type AssistantTaskData = {
  placement_analytics: PlacementAnalytics
  placement_prediction_explanation: PlacementExplanation
  interview_question: InterviewQuestion
  interview_answer_evaluation: InterviewEvaluation
  interview_report: InterviewReport
  communication_feedback: CommunicationFeedback
  team_suggestion: TeamSuggestion
}

export type AssistantTaskResponse<T = unknown> = {
  task: AssistantTask
  text: string
  data?: T
}

/** Typed browser client for the temporary placement/interview adapter. */
export async function requestAssistantTask<T = unknown>(
  task: AssistantTask,
  prompt: string,
): Promise<AssistantTaskResponse<T>> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, prompt }),
  })
  const data = await response.json().catch(() => ({})) as Partial<AssistantTaskResponse<T>> & { error?: string }
  if (!response.ok) throw new Error(data.error || "The assistant task failed")
  return {
    task: data.task ?? task,
    text: data.text ?? "",
    data: data.data,
  }
}

export async function requestTypedAssistantTask<T extends AssistantTask>(
  task: T,
  prompt: string,
): Promise<AssistantTaskResponse<AssistantTaskData[T]>> {
  return requestAssistantTask<AssistantTaskData[T]>(task, prompt)
}
