"use client"

import CourseCard from "./course-card"
import { useCourses } from "../course-context"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

export default function CourseList() {
  const { courses } = useCourses()

  if (courses.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "64px 24px", fontFamily: font,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          backgroundColor: "#f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <svg style={{ width: 24, height: 24, color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No courses yet</p>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>Create your first course to get started</p>
      </div>
    )
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 16,
      fontFamily: font,
    }}>
      {courses.map((course, i) => (
        <CourseCard
          key={course.id}
          title={course.title}
          instructor={course.instructor}
          students={course.students}
          index={i}
        />
      ))}
    </div>
  )
}