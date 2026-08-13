"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserCircle2, Settings2, BellRing } from "lucide-react"

const NAV_ITEMS = [
  { name: "Profile", path: "/dashboard/account/profile", icon: UserCircle2 },
  { name: "Settings", path: "/dashboard/account/settings", icon: Settings2 },
  { name: "Notifications", path: "/dashboard/account/notifications", icon: BellRing },
]

export function AccountNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.path

        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon size={17} strokeWidth={isActive ? 2.4 : 2} />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
