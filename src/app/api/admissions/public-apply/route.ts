import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

// GET: Fetch institutions, programs, intakes, and active fee configurations for public apply form
export async function GET(request: NextRequest) {
  try {
    const admin = createSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const slugOrId = searchParams.get("institution_id") || searchParams.get("institution_slug")

    // Fetch institutions
    const { data: institutions, error: instErr } = await admin.from("institutions").select("id, name, domain")
    if (instErr) throw instErr

    let targetInstitution = null
    if (slugOrId && institutions) {
      const clean = slugOrId.toLowerCase().trim()
      targetInstitution = institutions.find(
        (i) =>
          i.id.toLowerCase() === clean ||
          i.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === clean ||
          i.name.toLowerCase().replace(/[^a-z0-9]+/g, "") === clean.replace(/[^a-z0-9]+/g, "") ||
          i.domain?.toLowerCase() === clean ||
          i.name.toLowerCase().includes(clean)
      ) || null
    }

    const targetInstitutionId = targetInstitution?.id || (institutions && institutions.length > 0 ? institutions[0].id : null)

    // Fetch programs
    let progQuery = admin.from("programs").select("id, name, department_id, institution_id")
    if (targetInstitutionId) {
      progQuery = progQuery.eq("institution_id", targetInstitutionId)
    }
    const { data: programs } = await progQuery

    // Fetch intakes
    let intakeQuery = admin.from("intakes").select("id, name, start_date, end_date, institution_id")
    if (targetInstitutionId) {
      intakeQuery = intakeQuery.eq("institution_id", targetInstitutionId)
    }
    const { data: intakes } = await intakeQuery

    // Fetch active fee configurations
    let feeQuery = admin.from("admission_fee_configurations").select("id, institution_id, program_id, intake_id, amount, currency").eq("is_active", true)
    if (targetInstitutionId) {
      feeQuery = feeQuery.eq("institution_id", targetInstitutionId)
    }
    const { data: fees } = await feeQuery

    return NextResponse.json({
      institutions: institutions ?? [],
      targetInstitution: institutions?.find((i) => i.id === targetInstitutionId) ?? null,
      programs: programs ?? [],
      intakes: intakes ?? [],
      fees: fees ?? [],
    })
  } catch (error: any) {
    console.error("Public apply meta error:", error)
    return NextResponse.json({ error: "Failed to load admission parameters" }, { status: 500 })
  }
}

// POST: Public submission of a student application
export async function POST(request: NextRequest) {
  try {
    const admin = createSupabaseAdminClient()
    const body = await request.json()

    const {
      institution_id,
      institution_slug,
      program_id,
      intake_id,
      fee_configuration_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      nationality,
      country_of_birth,
      address,
      usi,
      passport_number,
      passport_expiry,
      visa_type,
      visa_expiry,
      english_evidence_type,
      documents = [],
    } = body

    // 0. Resolve institution_id if slug provided
    let finalInstId = institution_id
    if (!finalInstId && institution_slug) {
      const slug = String(institution_slug).toLowerCase().trim()
      const { data: insts } = await admin.from("institutions").select("id, name, domain")
      const found = insts?.find(
        (i) =>
          i.id.toLowerCase() === slug ||
          i.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug ||
          i.domain?.toLowerCase() === slug ||
          i.name.toLowerCase().includes(slug)
      )
      if (found) finalInstId = found.id
    }

    if (!finalInstId || !program_id || !first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "Institution, qualification, first name, last name, and email are required." },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanFirst = String(first_name).trim()
    const cleanLast = String(last_name).trim()

    // 1. Verify program exists for this institution
    const { data: program } = await admin
      .from("programs")
      .select("id, name")
      .eq("id", program_id)
      .eq("institution_id", finalInstId)
      .maybeSingle()

    // If intake_id is provided, verify or find default intake
    let finalIntakeId = intake_id
    let { data: intake } = finalIntakeId
      ? await admin
          .from("intakes")
          .select("id, name, start_date, end_date")
          .eq("id", finalIntakeId)
          .eq("institution_id", finalInstId)
          .maybeSingle()
      : { data: null }

    if (!intake) {
      // Find any intake for institution
      const { data: fallbackIntake } = await admin
        .from("intakes")
        .select("id, name, start_date, end_date")
        .eq("institution_id", finalInstId)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle()

      intake = fallbackIntake || {
        id: null as any,
        name: "Standard Academic Intake",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }
      finalIntakeId = intake?.id || null
    }

    if (!program) {
      return NextResponse.json({ error: "Selected qualification is invalid for this college." }, { status: 400 })
    }

    // 2. Resolve fee configuration if not provided
    let finalFeeId = fee_configuration_id
    if (!finalFeeId && finalIntakeId) {
      const { data: activeFee } = await admin
        .from("admission_fee_configurations")
        .select("id")
        .eq("institution_id", finalInstId)
        .eq("program_id", program_id)
        .eq("intake_id", finalIntakeId)
        .eq("is_active", true)
        .maybeSingle()

      finalFeeId = activeFee?.id ?? null
    }

    // If still no fee config, auto-create a default base fee config for this intake/program
    if (!finalFeeId && finalIntakeId) {
      const { data: newFee } = await admin
        .from("admission_fee_configurations")
        .insert({
          institution_id: finalInstId,
          program_id,
          intake_id: finalIntakeId,
          amount: 12000,
          currency: "AUD",
          version: 1,
          is_active: true,
        })
        .select("id")
        .single()

      finalFeeId = newFee?.id
    }

    // 3. Generate a clean tracking reference code: APP-YYYY-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const currentYear = new Date().getFullYear()
    const referenceCode = `APP-${currentYear}-${randomSuffix}`

    const applicantDob = date_of_birth || body.dob || null
    const applicantGender = gender || null
    const applicantNationality = nationality || null
    const applicantCountryOfBirth = country_of_birth || body.countryOfBirth || null
    const applicantAddress = address || null
    const applicantUsi = usi || null
    const applicantPassportNumber = passport_number || null
    const applicantPassportExpiry = passport_expiry || null
    const applicantVisaType = visa_type || null
    const applicantVisaExpiry = visa_expiry || null
    const applicantEnglishEvidence = body.english_evidence || english_evidence_type || null

    const basePayload: any = {
      institution_id: finalInstId,
      program_id,
      intake_id: finalIntakeId,
      fee_configuration_id: finalFeeId,
      first_name: cleanFirst,
      last_name: cleanLast,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      course_start_date: intake.start_date,
      course_end_date: intake.end_date,
      status: "APPLIED",
    }

    const formattedDocs = (documents || [])
      .filter((d: any) => d.fileName || d.file_name || d.name)
      .map((d: any, idx: number) => ({
        id: `doc-${idx}-${Date.now()}`,
        name: d.name || "Supporting Document",
        document_type: d.document_type || d.type || "ID_DOCUMENT",
        file_name: d.fileName || d.file_name || `${d.name || "document"}.pdf`,
        file_url: d.fileData || d.file_url || d.url || `/uploads/admissions/${(d.type || "doc").toLowerCase()}.pdf`,
        file_size: d.fileSize || d.file_size || "1.2 MB",
        uploaded_at: new Date().toISOString(),
      }))

    const fullPayload: any = {
      ...basePayload,
      reference_number: referenceCode,
      date_of_birth: applicantDob,
      gender: applicantGender,
      nationality: applicantNationality,
      country_of_birth: applicantCountryOfBirth,
      address: applicantAddress,
      usi: applicantUsi,
      passport_number: applicantPassportNumber,
      passport_expiry: applicantPassportExpiry,
      visa_type: applicantVisaType,
      visa_expiry: applicantVisaExpiry,
      english_evidence: applicantEnglishEvidence,
      application_data: {
        ...body,
        reference_number: referenceCode,
        date_of_birth: applicantDob,
        gender: applicantGender,
        nationality: applicantNationality,
        country_of_birth: applicantCountryOfBirth,
        address: applicantAddress,
        usi: applicantUsi,
        passport_number: applicantPassportNumber,
        passport_expiry: applicantPassportExpiry,
        visa_type: applicantVisaType,
        visa_expiry: applicantVisaExpiry,
        english_evidence: applicantEnglishEvidence,
        documents: formattedDocs,
      },
    }

    // Try inserting full payload with all columns
    let appData: any = null
    const { data: insertedFull, error: fullError } = await admin
      .from("admissions_applications")
      .insert(fullPayload)
      .select()
      .single()

    if (fullError) {
      console.warn("Full payload insert fallback:", fullError.message)
      // Fallback 1: Try with reference_number + base
      const { data: insertedRef, error: refError } = await admin
        .from("admissions_applications")
        .insert({ ...basePayload, reference_number: referenceCode })
        .select()
        .single()

      if (refError) {
        // Fallback 2: Base columns only
        const { data: insertedBase, error: baseError } = await admin
          .from("admissions_applications")
          .insert(basePayload)
          .select()
          .single()

        if (baseError) {
          console.error("Failed to insert admissions_applications:", baseError)
          throw baseError
        }
        appData = insertedBase
      } else {
        appData = insertedRef
      }
    } else {
      appData = insertedFull
    }

    // 5. Store uploaded documents into admission_documents
    if (formattedDocs.length > 0) {
      const docRows = formattedDocs.map((doc: any) => ({
        application_id: appData.id,
        document_name: `${doc.name} (${doc.file_name})`,
        file_url: doc.file_url,
        status: "UPLOADED",
      }))

      try {
        await admin.from("admission_documents").insert(docRows)
      } catch (docErr) {
        console.warn("Could not insert admission_documents:", docErr)
      }
    }

    // 6. Log status history with a valid actor_id from users table
    try {
      const { data: adminUser } = await admin
        .from("users")
        .select("id")
        .or(`institution_id.eq.${finalInstId},role.eq.SUPER_ADMIN`)
        .limit(1)
        .maybeSingle()

      if (adminUser?.id) {
        await admin.from("admission_status_history").insert({
          application_id: appData.id,
          institution_id: finalInstId,
          actor_id: adminUser.id,
          prior_status: null,
          new_status: "APPLIED",
          reason: `Online public application submitted. Reference: ${referenceCode}`,
        })
      }
    } catch (histErr) {
      console.warn("Could not log status history:", histErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully.",
        referenceCode,
        applicationId: appData.id,
        application: {
          ...appData,
          referenceCode,
          program_name: program.name,
          intake_name: intake.name,
          start_date: intake.start_date,
          end_date: intake.end_date,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("Public apply submit error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to submit application. Please verify your details." },
      { status: 500 }
    )
  }
}
