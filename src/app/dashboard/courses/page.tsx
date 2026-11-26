import CourseList from "@/modules/courses/components/course-list"
import CreateCourseDialog from "@/modules/courses/components/create-course-dialog"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

export default function CoursesPage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f4f5f7",
      padding: 24,
      fontFamily: font,
    }}>
      {/* Page header */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 24,
        gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.02em",
            margin: 0,
          }}>
            Courses
          </h1>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            Manage and organise your courses
          </p>
        </div>

        <CreateCourseDialog />
      </div>

      {/* Course list */}
      <CourseList />
    </div>
  )
}