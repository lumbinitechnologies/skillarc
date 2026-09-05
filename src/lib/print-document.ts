/**
 * Utility to print clean, isolated DOM elements without background dashboard or layout bleed.
 */
export function printIsolatedElement(
  elementId: string,
  options?: {
    title?: string
    orientation?: "landscape" | "portrait"
    margin?: string
    columnCount?: number
  }
) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`Print element #${elementId} not found`)
    return
  }

  const title = options?.title || "SkillArc Document Export"
  const orientation = options?.orientation || "landscape"
  const margin = options?.margin || "5mm 6mm"
  const colCount = options?.columnCount || 6

  // Dynamic font sizing based on column density
  const cellFontSize = colCount > 12 ? "6px" : colCount > 8 ? "7px" : "8px"
  const headerFontSize = colCount > 12 ? "6px" : colCount > 8 ? "6.8px" : "7.5px"
  const cellPadding = colCount > 12 ? "2px 1px" : colCount > 8 ? "2.5px 1.5px" : "3.5px 2.5px"

  // Create an isolated hidden iframe
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0px"
  iframe.style.height = "0px"
  iframe.style.border = "none"
  iframe.style.visibility = "hidden"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  // Clone styles and Tailwind classes
  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((s) => s.outerHTML)
    .join("\n")

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800;900&family=Space+Grotesk:wght@500;600;700;900&display=swap" rel="stylesheet">
        ${styles}
        <style>
          @page {
            size: ${orientation} !important;
            margin: ${margin} !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 8px !important;
          }
          /* Eliminate any scrollbars or overflow clipping in print */
          div {
            overflow: visible !important;
            max-width: 100% !important;
          }
          table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          th, td {
            font-size: ${cellFontSize} !important;
            padding: ${cellPadding} !important;
            line-height: 1.15 !important;
            min-width: 0 !important;
            max-width: none !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
          }
          .grade-col-header {
            font-size: ${headerFontSize} !important;
            line-height: 1.08 !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .print-hidden, .print\\:hidden {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div style="padding: 0; width: 100%; max-width: 100%;">
          ${el.innerHTML}
        </div>
      </body>
    </html>
  `)
  doc.close()

  // Trigger print after iframe renders
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 2000)
  }, 350)
}
