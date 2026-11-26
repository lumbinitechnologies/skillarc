interface Program {
  id: string
  name: string
}

interface Section {
  id: string
  name: string
  semester: number
  program_id: string
}

interface Props {
  programs: Program[]
  sections: Section[]

  selectedProgram: string
  selectedSemester: string
  selectedSection: string

  onProgramChange: (value: string) => void
  onSemesterChange: (value: string) => void
  onSectionChange: (value: string) => void
}

export default function StudentFilters({
  programs,
  sections,

  selectedProgram,
  selectedSemester,
  selectedSection,

  onProgramChange,
  onSemesterChange,
  onSectionChange,
}: Props) {
  const semesters = [...new Set(sections.map((s) => s.semester))].sort()

  const filteredSections = sections.filter((section) => {
    if (selectedProgram && section.program_id !== selectedProgram) {
      return false
    }

    if (
      selectedSemester &&
      section.semester !== Number(selectedSemester)
    ) {
      return false
    }

    return true
  })

  return (
    <div className="grid gap-4 md:grid-cols-3">

      <select
        value={selectedProgram}
        onChange={(e) => onProgramChange(e.target.value)}
        className="h-12 rounded-2xl border border-slate-200/80 bg-white px-4 text-sm shadow-sm outline-none transition-all duration-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 hover:shadow-md cursor-pointer text-slate-700"
      >
        <option value="">All Programs</option>

        {programs.map((program) => (
          <option key={program.id} value={program.id}>
            {program.name}
          </option>
        ))}
      </select>

      <select
        value={selectedSemester}
        onChange={(e) => onSemesterChange(e.target.value)}
        className="h-12 rounded-2xl border border-slate-200/80 bg-white px-4 text-sm shadow-sm outline-none transition-all duration-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 hover:shadow-md cursor-pointer text-slate-700"
      >
        <option value="">All Semesters</option>

        {semesters.map((semester) => (
          <option key={semester} value={semester}>
            Semester {semester}
          </option>
        ))}
      </select>

      <select
        value={selectedSection}
        onChange={(e) => onSectionChange(e.target.value)}
        className="h-12 rounded-2xl border border-slate-200/80 bg-white px-4 text-sm shadow-sm outline-none transition-all duration-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 hover:shadow-md cursor-pointer text-slate-700"
      >
        <option value="">All Sections</option>

        {filteredSections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>

    </div>
  )
}