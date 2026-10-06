export interface BulkImportRow {
  [key: string]: string | undefined
}

export function parseCsvText(text: string): BulkImportRow[] {
  const parsedRows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ""
  let inQuotes = false

  const pushCurrentRow = () => {
    parsedRows.push(currentRow)
    currentRow = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (char === '"') {
      const next = text[index + 1]
      if (inQuotes && next === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue)
      currentValue = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r") {
        const next = text[index + 1]
        if (next === "\n") {
          index += 1
        }
      }

      currentRow.push(currentValue)
      pushCurrentRow()
      currentValue = ""
      continue
    }

    currentValue += char
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue)
    pushCurrentRow()
  }

  if (parsedRows.length === 0) return []

  const headers = parsedRows[0]?.map((header) => header.trim()) ?? []
  const body = parsedRows.slice(1)

  return body
    .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells) => {
      const row: BulkImportRow = {}
      headers.forEach((header, idx) => {
        row[header] = cells[idx] ?? ""
      })
      return row
    })
}

export function normalizeImportRows(rows: BulkImportRow[]): BulkImportRow[] {
  return rows.map((row) => {
    const normalized: BulkImportRow = {}

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace(/\*/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
      normalized[normalizedKey] = value?.trim()
    })

    return normalized
  })
}
