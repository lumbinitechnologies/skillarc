import "./globals.css"
import { Inter, Plus_Jakarta_Sans, Space_Grotesk, Space_Mono } from "next/font/google"
import ChatbotWrapper from "@/components/chatbot/ChatbotWrapper"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
})

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
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <ChatbotWrapper />
      </body>
    </html>
  )
}
