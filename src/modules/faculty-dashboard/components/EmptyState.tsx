"use client"

import { BookOpen } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface EmptyStateProps {
  title: string
  description: string
}

export default function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "2px dashed #e5e7eb",
        borderRadius: 20,
        padding: "48px 24px",
        textAlign: "center",
        fontFamily: font,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#ecfdf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <BookOpen size={34} color="#059669" />
      </div>

      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 10,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          maxWidth: 420,
          margin: "0 auto",
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  )
}