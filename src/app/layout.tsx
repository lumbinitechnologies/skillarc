import "./globals.css"
import ChatbotWidget from "@/components/chatbot/ChatbotWidget"

export const metadata = {
  title: "SkillArc | Connected university operations",
  description: "SkillArc connects admissions, academic operations, student progress, and placements in one clear university workspace.",
  icons: {
    icon: "/skillarc_logo.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  )
}
