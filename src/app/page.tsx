import LandingNavbar from "@/components/landing/navbar"
import BookScrollAnimation from "@/components/landing/book-scroll"
import Hero from "@/components/landing/hero"
import Ecosystem from "@/components/landing/ecosystem"
import StudentExperience from "@/components/landing/student-experience"
import { CtaSection, Footer } from "@/components/landing/footer"
import SmoothScrollProvider from "@/components/landing/smooth-scroll"

export default function Home() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-[#0B132B] text-[#EFEAD8] antialiased selection:bg-[#FF5500] selection:text-[#EFEAD8]">
        {/* 1. NAVBAR */}
        <LandingNavbar />

        {/* 2. BOOK SCROLL ANIMATION (TOP OF HOME PAGE) */}
        <BookScrollAnimation />

        {/* 3. HERO */}
        <Hero />

        {/* 4. TRUST / VALUE STRIP + CORE ECOSYSTEM PILLARS */}
        <Ecosystem />

        {/* 5. STUDENT / TEACHER ACCORDION EXPERIENCE */}
        <StudentExperience />

        {/* 6. CTA SECTION */}
        <div className="bg-[#0B132B] text-[#EFEAD8]">
          <CtaSection variant="orange" />
        </div>

        {/* 7. FOOTER */}
        <div className="bg-[#EFEAD8] text-[#0B132B]">
          <Footer variant="orange" />
        </div>
      </div>
    </SmoothScrollProvider>
  )
}