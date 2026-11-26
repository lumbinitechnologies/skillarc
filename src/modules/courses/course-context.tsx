"use client"

import { createContext, useContext, useState } from "react"
import { Course } from "./types/course.types"

interface CourseContextType {
  courses: Course[]
  addCourse: (course: Course) => void
}

const CourseContext = createContext<CourseContextType | undefined>(undefined)

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([
    {
      id: 1,
      title: "React Fundamentals",
      instructor: "John Doe",
      students: 120,
    },
    {
      id: 2,
      title: "UI/UX Design",
      instructor: "Sarah Lee",
      students: 85,
    },
  ])

  function addCourse(course: Course) {
    setCourses((prev) => [...prev, course])
  }

  return (
    <CourseContext.Provider value={{ courses, addCourse }}>
      {children}
    </CourseContext.Provider>
  )
}

export function useCourses() {
  const context = useContext(CourseContext)

  if (!context) {
    throw new Error("useCourses must be used inside CourseProvider")
  }

  return context
}