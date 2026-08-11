import "./globals.css"
import ChatbotWidget from "@/components/chatbot/ChatbotWidget"

export const metadata = {
  title: "SkillArc LMS",
  description: "Learning Management System",
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
