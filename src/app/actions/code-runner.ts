"use server"

import { spawn } from "child_process"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

export interface TestCase {
  input: string
  output: string
}

export interface TestCaseResult {
  passed: boolean
  input: string
  expected: string
  actual: string
  error?: string
  executionTimeMs?: number
}

export interface CodeExecutionResponse {
  success: boolean
  errorType?: "empty" | "syntax" | "runtime" | "timeout" | "test_failed"
  errorMessage?: string
  syntaxError?: string
  runtimeError?: string
  results: TestCaseResult[]
  allPassed: boolean
  totalPassed: number
  totalTests: number
  logs: string[]
}

/**
 * Execute a subprocess with a timeout and input
 */
function runProcess(
  command: string,
  args: string[],
  stdinInput: string,
  timeoutMs = 4000
): Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean }> {
  return new Promise(resolve => {
    let stdout = ""
    let stderr = ""
    let timedOut = false

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    })

    const timer = setTimeout(() => {
      timedOut = true
      proc.kill("SIGKILL")
    }, timeoutMs)

    if (proc.stdin) {
      try {
        proc.stdin.write(stdinInput)
        proc.stdin.end()
      } catch {
        // Stdin write error
      }
    }

    if (proc.stdout) {
      proc.stdout.on("data", data => {
        stdout += data.toString()
      })
    }

    if (proc.stderr) {
      proc.stderr.on("data", data => {
        stderr += data.toString()
      })
    }

    proc.on("error", err => {
      clearTimeout(timer)
      resolve({ stdout, stderr: err.message, code: 1, timedOut: false })
    })

    proc.on("close", code => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code, timedOut })
    })
  })
}

/**
 * Normalize multiline output for flexible whitespace-insensitive matching
 */
function normalizeOutput(str: string): string {
  return str
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .trim()
}

/**
 * Verify student code solution against test cases
 */
export async function verifyCodeAction(
  code: string,
  language: string,
  testCases: TestCase[] = []
): Promise<CodeExecutionResponse> {
  const logs: string[] = []

  // 1. Validate empty code (CODE-020)
  if (!code || !code.trim()) {
    return {
      success: false,
      errorType: "empty",
      errorMessage: "Cannot run or submit empty code. Please write your solution.",
      results: [],
      allPassed: false,
      totalPassed: 0,
      totalTests: testCases.length,
      logs: [
        "[VALIDATION ERROR] Solution code is empty.",
        "Please write a valid solution before running or submitting."
      ],
    }
  }

  const lang = (language || "python").toLowerCase()
  logs.push(`> Compiling & running solution in sandbox (${lang.toUpperCase()})...`)

  const effectiveTestCases = testCases.length > 0
    ? testCases
    : [{ input: "", output: "" }]

  const results: TestCaseResult[] = []

  try {
    if (lang === "python" || lang === "py") {
      // Step A: Syntax validation via ast.parse (CODE-018)
      const syntaxCheck = await runProcess(
        "python3",
        ["-c", "import ast, sys; ast.parse(sys.stdin.read())"],
        code,
        3000
      )

      if (syntaxCheck.code !== 0 && syntaxCheck.stderr) {
        const cleanErr = syntaxCheck.stderr.replace(/Traceback[\s\S]*?File "<string>", line \d+, in <module>\s+ast\.parse\([\s\S]*?\)\s*/g, "").trim()
        logs.push(`[COMPILATION ERROR] Python Syntax Validation Failed:`)
        cleanErr.split("\n").forEach(l => logs.push(`  ${l}`))
        return {
          success: false,
          errorType: "syntax",
          errorMessage: "Python Syntax Error: Please check your code syntax.",
          syntaxError: cleanErr,
          results: [],
          allPassed: false,
          totalPassed: 0,
          totalTests: effectiveTestCases.length,
          logs,
        }
      }

      // Step B: Execute against each test case (CODE-014, CODE-015, CODE-019)
      for (let i = 0; i < effectiveTestCases.length; i++) {
        const tc = effectiveTestCases[i]
        const startTime = Date.now()

        const execRes = await runProcess(
          "python3",
          ["-c", code],
          tc.input,
          4000
        )
        const elapsed = Date.now() - startTime

        if (execRes.timedOut) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: "Error: Time Limit Exceeded (> 4.0s)",
            error: "Time Limit Exceeded",
            executionTimeMs: elapsed,
          })
          logs.push(`  [TIMEOUT] Case ${i + 1}: Execution exceeded 4.0s limit.`)
          continue
        }

        if (execRes.code !== 0 && execRes.stderr) {
          const cleanErr = execRes.stderr.trim()
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: cleanErr,
            error: cleanErr,
            executionTimeMs: elapsed,
          })
          logs.push(`  [RUNTIME ERROR] Case ${i + 1}: ${cleanErr.split("\n").pop() || cleanErr}`)
          continue
        }

        const actualOut = normalizeOutput(execRes.stdout)
        const expectedOut = normalizeOutput(tc.output)
        const passed = actualOut === expectedOut

        results.push({
          passed,
          input: tc.input,
          expected: tc.output,
          actual: actualOut,
          executionTimeMs: elapsed,
        })

        if (passed) {
          logs.push(`  [SUCCESS] Case ${i + 1}: Input (${tc.input || "none"}) → Output: "${actualOut}" (${elapsed}ms)`)
        } else {
          logs.push(`  [FAILED] Case ${i + 1}: Input (${tc.input || "none"}) → Expected: "${expectedOut}" | Actual: "${actualOut}" (${elapsed}ms)`)
        }
      }
    } else if (lang === "javascript" || lang === "js") {
      // Step A: Syntax check for JavaScript
      const syntaxCheck = await runProcess(
        "node",
        ["-e", `
          const fs = require('fs');
          const code = fs.readFileSync(0, 'utf-8');
          try {
            new Function(code);
          } catch(e) {
            console.error(e.name + ': ' + e.message);
            process.exit(1);
          }
        `],
        code,
        3000
      )

      if (syntaxCheck.code !== 0 && syntaxCheck.stderr) {
        const cleanErr = syntaxCheck.stderr.trim()
        logs.push(`[COMPILATION ERROR] JavaScript Syntax Validation Failed:`)
        cleanErr.split("\n").forEach(l => logs.push(`  ${l}`))
        return {
          success: false,
          errorType: "syntax",
          errorMessage: "JavaScript Syntax Error: Please check your code syntax.",
          syntaxError: cleanErr,
          results: [],
          allPassed: false,
          totalPassed: 0,
          totalTests: effectiveTestCases.length,
          logs,
        }
      }

      // Step B: Execute JavaScript
      for (let i = 0; i < effectiveTestCases.length; i++) {
        const tc = effectiveTestCases[i]
        const startTime = Date.now()

        const execRes = await runProcess(
          "node",
          ["-e", code],
          tc.input,
          4000
        )
        const elapsed = Date.now() - startTime

        if (execRes.timedOut) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: "Error: Time Limit Exceeded (> 4.0s)",
            error: "Time Limit Exceeded",
            executionTimeMs: elapsed,
          })
          logs.push(`  [TIMEOUT] Case ${i + 1}: Execution exceeded 4.0s limit.`)
          continue
        }

        if (execRes.code !== 0 && execRes.stderr) {
          const cleanErr = execRes.stderr.trim()
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: cleanErr,
            error: cleanErr,
            executionTimeMs: elapsed,
          })
          logs.push(`  [RUNTIME ERROR] Case ${i + 1}: ${cleanErr.split("\n").pop() || cleanErr}`)
          continue
        }

        const actualOut = normalizeOutput(execRes.stdout)
        const expectedOut = normalizeOutput(tc.output)
        const passed = actualOut === expectedOut

        results.push({
          passed,
          input: tc.input,
          expected: tc.output,
          actual: actualOut,
          executionTimeMs: elapsed,
        })

        if (passed) {
          logs.push(`  [SUCCESS] Case ${i + 1}: Input (${tc.input || "none"}) → Output: "${actualOut}" (${elapsed}ms)`)
        } else {
          logs.push(`  [FAILED] Case ${i + 1}: Input (${tc.input || "none"}) → Expected: "${expectedOut}" | Actual: "${actualOut}" (${elapsed}ms)`)
        }
      }
    } else if (lang === "cpp" || lang === "c++") {
      // Step A: Write to temporary file and compile C++
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpp_run_"))
      const srcFile = path.join(tmpDir, "main.cpp")
      const binFile = path.join(tmpDir, "main_bin")

      await fs.writeFile(srcFile, code, "utf-8")

      const compileRes = await runProcess("g++", ["-O2", "-o", binFile, srcFile], "", 5000)

      if (compileRes.code !== 0 || compileRes.stderr) {
        const cleanErr = compileRes.stderr.trim()
        logs.push(`[COMPILATION ERROR] C++ Compilation Failed:`)
        cleanErr.split("\n").forEach(l => logs.push(`  ${l}`))
        await fs.rm(tmpDir, { recursive: true, force: true })
        return {
          success: false,
          errorType: "syntax",
          errorMessage: "C++ Compilation Error: Please fix compilation errors.",
          syntaxError: cleanErr,
          results: [],
          allPassed: false,
          totalPassed: 0,
          totalTests: effectiveTestCases.length,
          logs,
        }
      }

      // Step B: Execute C++ binary
      for (let i = 0; i < effectiveTestCases.length; i++) {
        const tc = effectiveTestCases[i]
        const startTime = Date.now()

        const execRes = await runProcess(binFile, [], tc.input, 4000)
        const elapsed = Date.now() - startTime

        if (execRes.timedOut) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: "Error: Time Limit Exceeded (> 4.0s)",
            error: "Time Limit Exceeded",
            executionTimeMs: elapsed,
          })
          logs.push(`  [TIMEOUT] Case ${i + 1}: Execution exceeded limit.`)
          continue
        }

        if (execRes.code !== 0 && execRes.stderr) {
          const cleanErr = execRes.stderr.trim()
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: cleanErr,
            error: cleanErr,
            executionTimeMs: elapsed,
          })
          logs.push(`  [RUNTIME ERROR] Case ${i + 1}: ${cleanErr}`)
          continue
        }

        const actualOut = normalizeOutput(execRes.stdout)
        const expectedOut = normalizeOutput(tc.output)
        const passed = actualOut === expectedOut

        results.push({
          passed,
          input: tc.input,
          expected: tc.output,
          actual: actualOut,
          executionTimeMs: elapsed,
        })

        if (passed) {
          logs.push(`  [SUCCESS] Case ${i + 1}: Input (${tc.input || "none"}) → Output: "${actualOut}" (${elapsed}ms)`)
        } else {
          logs.push(`  [FAILED] Case ${i + 1}: Input (${tc.input || "none"}) → Expected: "${expectedOut}" | Actual: "${actualOut}" (${elapsed}ms)`)
        }
      }

      await fs.rm(tmpDir, { recursive: true, force: true })
    } else if (lang === "java") {
      // Step A: Write to temporary file and compile Java
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "java_run_"))
      const srcFile = path.join(tmpDir, "Main.java")

      await fs.writeFile(srcFile, code, "utf-8")

      const compileRes = await runProcess("javac", [srcFile], "", 6000)

      if (compileRes.code !== 0 || compileRes.stderr) {
        const cleanErr = compileRes.stderr.trim()
        logs.push(`[COMPILATION ERROR] Java Compilation Failed:`)
        cleanErr.split("\n").forEach(l => logs.push(`  ${l}`))
        await fs.rm(tmpDir, { recursive: true, force: true })
        return {
          success: false,
          errorType: "syntax",
          errorMessage: "Java Compilation Error: Please fix compilation errors.",
          syntaxError: cleanErr,
          results: [],
          allPassed: false,
          totalPassed: 0,
          totalTests: effectiveTestCases.length,
          logs,
        }
      }

      // Step B: Execute Java
      for (let i = 0; i < effectiveTestCases.length; i++) {
        const tc = effectiveTestCases[i]
        const startTime = Date.now()

        const execRes = await runProcess("java", ["-cp", tmpDir, "Main"], tc.input, 4000)
        const elapsed = Date.now() - startTime

        if (execRes.timedOut) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: "Error: Time Limit Exceeded (> 4.0s)",
            error: "Time Limit Exceeded",
            executionTimeMs: elapsed,
          })
          logs.push(`  [TIMEOUT] Case ${i + 1}: Execution exceeded limit.`)
          continue
        }

        if (execRes.code !== 0 && execRes.stderr) {
          const cleanErr = execRes.stderr.trim()
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.output,
            actual: cleanErr,
            error: cleanErr,
            executionTimeMs: elapsed,
          })
          logs.push(`  [RUNTIME ERROR] Case ${i + 1}: ${cleanErr}`)
          continue
        }

        const actualOut = normalizeOutput(execRes.stdout)
        const expectedOut = normalizeOutput(tc.output)
        const passed = actualOut === expectedOut

        results.push({
          passed,
          input: tc.input,
          expected: tc.output,
          actual: actualOut,
          executionTimeMs: elapsed,
        })

        if (passed) {
          logs.push(`  [SUCCESS] Case ${i + 1}: Input (${tc.input || "none"}) → Output: "${actualOut}" (${elapsed}ms)`)
        } else {
          logs.push(`  [FAILED] Case ${i + 1}: Input (${tc.input || "none"}) → Expected: "${expectedOut}" | Actual: "${actualOut}" (${elapsed}ms)`)
        }
      }

      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  } catch (err: any) {
    logs.push(`[SYSTEM ERROR] Unexpected execution failure: ${err.message}`)
    return {
      success: false,
      errorType: "runtime",
      errorMessage: err.message || "Failed to execute code in sandbox.",
      runtimeError: err.message,
      results,
      allPassed: false,
      totalPassed: results.filter(r => r.passed).length,
      totalTests: effectiveTestCases.length,
      logs,
    }
  }

  const allPassed = results.length > 0 && results.every(r => r.passed)
  const totalPassed = results.filter(r => r.passed).length

  if (allPassed) {
    logs.push(`✓ All ${totalPassed} test cases passed successfully! Code is valid and ready to submit.`)
  } else {
    const hasRuntime = results.some(r => r.error && r.error !== "Time Limit Exceeded")
    if (hasRuntime) {
      logs.push(`✗ Execution Failed: Runtime errors occurred. Please debug your code.`)
    } else {
      logs.push(`✗ Verification Failed: ${results.length - totalPassed} of ${results.length} test cases failed.`)
    }
  }

  return {
    success: allPassed,
    errorType: allPassed ? undefined : results.some(r => r.error) ? "runtime" : "test_failed",
    errorMessage: allPassed
      ? undefined
      : `Verification failed: ${results.length - totalPassed} test case(s) failed.`,
    results,
    allPassed,
    totalPassed,
    totalTests: effectiveTestCases.length,
    logs,
  }
}
