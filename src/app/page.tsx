"use client"

import LandingNavbar from "@/components/landing/navbar"
import Hero from "@/components/landing/hero"
import Ecosystem from "@/components/landing/ecosystem"
import StudentExperience from "@/components/landing/student-experience"
import { CtaSection, Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B132B] text-[#EFEAD8] antialiased selection:bg-[#FF5500] selection:text-[#EFEAD8]">
      {/* 1. NAVBAR */}
      <LandingNavbar />

      {/* 2. HERO */}
      <Hero />

      {/* 3. TRUST / VALUE STRIP + CORE ECOSYSTEM PILLARS */}
      <Ecosystem />

      {/* 4. STUDENT / TEACHER ACCORDION EXPERIENCE */}
      <StudentExperience />

      {/* 5. CTA SECTION */}
      <div className="bg-[#0B132B] text-[#EFEAD8]">
        <CtaSection variant="orange" />
      </div>

      {/* 6. FOOTER */}
      <div className="bg-[#EFEAD8] text-[#0B132B]">
        <Footer variant="orange" />
      </div>
    </div>
  )
}