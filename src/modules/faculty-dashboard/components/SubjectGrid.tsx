"use client"

import { BookOpen, GraduationCap } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface Subject {
  id: string
  name: string
  code: string
}

interface SubjectGridProps {
  subjects: Subject[]
}

export default function SubjectGrid({ subjects }: SubjectGridProps) {
  if (subjects.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef2f7",
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
          fontFamily: font,
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: "#ecfdf5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <BookOpen size={30} color="#059669" />
        </div>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          No Subjects Assigned
        </h3>

        <p
          style={{
            color: "#6b7280",
            fontSize: 14,
            maxWidth: 350,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Your Institution Administrator hasn&apos;t assigned any subjects yet.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eef2f7",
        borderRadius: 20,
        padding: 24,
        fontFamily: font,
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 20,
          color: "#111827",
        }}
      >
        My Subjects
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
          gap: 18,
        }}
      >
        {subjects.map((subject) => (
          <div
            key={subject.id}
            style={{
              border: "1px solid #eef2f7",
              borderRadius: 18,
              padding: 18,
              transition: ".2s",
              cursor: "pointer",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)"
              e.currentTarget.style.boxShadow =
                "0 12px 24px rgba(0,0,0,.06)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <BookOpen size={22} color="#059669" />
            </div>

            <h4
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 8,
              }}
            >
              {subject.name}
            </h4>

            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 18,
              }}
            >
              {subject.code}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#9ca3af",
                fontSize: 12,
              }}
            >
              <GraduationCap size={14} />
              Assigned Subject
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}