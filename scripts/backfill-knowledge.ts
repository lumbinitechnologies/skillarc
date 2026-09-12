#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { syncAssignmentKnowledge } from "@/lib/knowledge/assignment"
import { createBackfillReport, importLegacyRecord, parseLegacyManifest, readLegacySource, validateLegacyScope, type LegacyBackfillRecord } from "@/lib/knowledge/backfill"

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

async function assignmentsBackfill(admin: ReturnType<typeof createSupabaseAdminClient>, report: ReturnType<typeof createBackfillReport>, dryRun: boolean): Promise<void> {
  const { data, error } = await admin.from("assignments").select("id, type, title, description").in("type", ["Syllabus", "syllabus", "Material", "material"])
  if (error) throw error
  const assignments = data ?? []
  report.source_counts.assignments = assignments.length
  for (const assignment of assignments) {
    try {
      if (!String(assignment.description ?? "").trim()) {
        report.warnings.push({
          source: "assignment",
          id: assignment.id,
          warning: "Indexed content is title-only because description is empty",
        })
      }
      if (dryRun) {
        report.imported_counts.assignments += 1
        continue
      }
      const result = await syncAssignmentKnowledge(admin, assignment.id)
      report.imported_counts.assignments += result.created
      report.imported_counts.jobs += result.created
      report.imported_counts.skipped += result.skipped
      if (result.skipped)
        report.skipped_records.push({
          source: "assignment",
          id: assignment.id,
          reason: `${result.skipped} unchanged embedding-profile version(s)`,
        })
    } catch (error) {
      report.failed_jobs.push({
        source: "assignment",
        id: assignment.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function legacyBackfill(admin: ReturnType<typeof createSupabaseAdminClient>, records: LegacyBackfillRecord[], sourceRoot: string, report: ReturnType<typeof createBackfillReport>, dryRun: boolean): Promise<void> {
  report.source_counts.legacy_manifest = records.length
  for (const record of records) {
    const scopeError = await validateLegacyScope(admin, record.scope)
    if (scopeError) {
      report.unscoped_records.push({
        source: "legacy",
        id: record.legacy_id,
        reason: scopeError,
      })
      continue
    }
    let source: Awaited<ReturnType<typeof readLegacySource>>
    try {
      source = await readLegacySource(record, sourceRoot)
      if (!source.bytes.length) throw new Error("Source content is empty")
    } catch (error) {
      if (record.file_path)
        report.missing_files.push({
          source: "legacy",
          id: record.legacy_id,
          path: record.file_path,
        })
      else
        report.failed_jobs.push({
          source: "legacy",
          id: record.legacy_id,
          error: error instanceof Error ? error.message : String(error),
        })
      continue
    }
    if (dryRun) {
      report.imported_counts.legacy += 1
      continue
    }
    try {
      const result = await importLegacyRecord(admin, record, source)
      if (result === "skipped") {
        report.imported_counts.skipped += 1
        report.skipped_records.push({
          source: "legacy",
          id: record.legacy_id,
          reason: "same source version and content hash already exists",
        })
      } else {
        report.imported_counts.legacy += 1
        report.imported_counts.jobs += 1
      }
    } catch (error) {
      report.failed_jobs.push({
        source: "legacy",
        id: record.legacy_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function main(): Promise<void> {
  const manifestPath = argument("--manifest")
  const reportPath = argument("--report") || "knowledge-backfill-report.json"
  const sourceRoot = argument("--source-root") || "."
  const dryRun = process.argv.includes("--dry-run")
  if (!manifestPath) throw new Error("Usage: backfill-knowledge --manifest <legacy-export.json> --report <report.json> [--source-root <dir>] [--dry-run]")

  const report = createBackfillReport(dryRun)
  const rawManifest = JSON.parse(await readFile(manifestPath, "utf8"))
  const records = parseLegacyManifest(rawManifest)
  const admin = createSupabaseAdminClient()
  await legacyBackfill(admin, records, sourceRoot, report, dryRun)
  await assignmentsBackfill(admin, report, dryRun)
  report.finished_at = new Date().toISOString()
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
