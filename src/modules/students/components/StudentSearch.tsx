import { Search } from "lucide-react"

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function StudentSearch({
  value,
  onChange,
}: Props) {
  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, email or registration number..."
        className="
          h-12
          w-full
          rounded-2xl
          border
          border-slate-200/80
          bg-white
          pl-11
          pr-4
          text-sm
          shadow-sm
          outline-none
          transition-all
          duration-300
          focus:border-[#6C63FF]
          focus:ring-2
          focus:ring-indigo-100
          hover:border-slate-300
          hover:shadow-md
          text-slate-800
          placeholder-slate-400
        "
      />
    </div>
  )
}