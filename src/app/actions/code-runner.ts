"use server"

export interface CodeExecutionResponse {
  success: false
  errorType: "unavailable"
  errorMessage: string
  results: []
  allPassed: false
  totalPassed: 0
  totalTests: 0
  logs: string[]
}

/**
 * Code submitted by students is never executed by the application server.
 * Keep this action as an explicit compatibility response until an isolated,
 * reviewed execution service is available.
 */
export async function verifyCodeAction(): Promise<CodeExecutionResponse> {
  return {
    success: false,
    errorType: "unavailable",
    errorMessage: "Code execution is unavailable. Submit your work for instructor review.",
    results: [],
    allPassed: false,
    totalPassed: 0,
    totalTests: 0,
    logs: ["Automated code execution is unavailable."],
  }
}
