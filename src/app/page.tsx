import Hero from "@/components/landing/hero"
import Ecosystem from "@/components/landing/ecosystem"
import StudentExperience from "@/components/landing/student-experience"
import { MarketingShell } from "@/components/landing/marketing-ui"

export default function Home() {
  return (
    <MarketingShell>
      <Hero />
      <Ecosystem />
      <StudentExperience />
    </MarketingShell>
  )
}
