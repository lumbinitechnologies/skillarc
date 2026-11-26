// Pastel accent colors cycling per course index (passed as prop or derived from id)
const ACCENTS = [
  { bg: "#dbeafe", border: "#bfdbfe", dot: "#3b82f6", text: "#1d4ed8" },  // blue
  { bg: "#ede9fe", border: "#ddd6fe", dot: "#7c3aed", text: "#6d28d9" },  // violet
  { bg: "#d1fae5", border: "#a7f3d0", dot: "#10b981", text: "#065f46" },  // emerald
  { bg: "#fef3c7", border: "#fde68a", dot: "#f59e0b", text: "#b45309" },  // amber
  { bg: "#fce7f3", border: "#fbcfe8", dot: "#ec4899", text: "#9d174d" },  // pink
  { bg: "#ffedd5", border: "#fed7aa", dot: "#f97316", text: "#c2410c" },  // orange
]

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

export default function CourseCard({
  title,
  instructor,
  students,
  index = 0,
}: {
  title: string
  instructor: string
  students: number
  index?: number
}) {
  const accent = ACCENTS[index % ACCENTS.length]

  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: 16,
      border: "1px solid #f3f4f6",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      overflow: "hidden",
      fontFamily: font,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Colored top stripe */}
      <div style={{
        backgroundColor: accent.bg,
        borderBottom: `1px solid ${accent.border}`,
        padding: "14px 16px 12px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      }}>
        {/* Course initial badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: accent.dot,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
            {title.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Student count pill */}
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: accent.text,
          backgroundColor: "#fff",
          border: `1px solid ${accent.border}`,
          padding: "2px 8px", borderRadius: 999,
          flexShrink: 0,
        }}>
          {students} students
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3, margin: 0 }}>
          {title}
        </h2>

        {/* Instructor row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "linear-gradient(135deg, #e0e7ff, #bfdbfe)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#4338ca" }}>
              {instructor.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{instructor}</span>
        </div>

        {/* Progress bar (visual only) */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>Enrollment</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>{students}/50</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, backgroundColor: "#f3f4f6", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 999,
              backgroundColor: accent.dot,
              width: `${Math.min((students / 50) * 100, 100)}%`,
              transition: "width 0.4s",
            }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid #f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>View details →</span>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          backgroundColor: accent.dot,
        }} />
      </div>
    </div>
  )
}