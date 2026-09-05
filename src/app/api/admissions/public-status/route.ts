import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

// GET: Public application status and offer letter retrieval
export async function GET(request: NextRequest) {
  try {
    const admin = createSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get("id")
    const email = searchParams.get("email")

    const rawLookup = (applicationId || email || "").trim()
    if (!rawLookup) {
      return NextResponse.json({ error: "Application Reference ID or registered email is required." }, { status: 400 })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLookup)
    const isEmail = rawLookup.includes("@")

    let appData: any = null

    // 1. Direct UUID Lookup
    if (isUuid) {
      const { data, error } = await admin
        .from("admissions_applications")
        .select("*")
        .eq("id", rawLookup)
        .maybeSingle()
      if (data) appData = data
    }

    // 2. Email Lookup (Exact & Case-Insensitive)
    if (!appData && isEmail) {
      const { data, error } = await admin
        .from("admissions_applications")
        .select("*")
        .ilike("email", rawLookup.toLowerCase().trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) appData = data
    }

    // 3. Reference Number Lookup
    if (!appData) {
      try {
        const { data } = await admin
          .from("admissions_applications")
          .select("*")
          .ilike("reference_number", `%${rawLookup}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) appData = data
      } catch (err) {
        console.warn("Reference number column query skipped:", err)
      }
    }

    // 4. Status History Reason Reference Lookup (e.g. Reference: APP-2026-XXXX)
    if (!appData) {
      try {
        const { data: hist } = await admin
          .from("admission_status_history")
          .select("application_id")
          .ilike("reason", `%${rawLookup}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (hist?.application_id) {
          const { data } = await admin
            .from("admissions_applications")
            .select("*")
            .eq("id", hist.application_id)
            .maybeSingle()
          if (data) appData = data
        }
      } catch (histErr) {
        console.warn("Status history lookup skipped:", histErr)
      }
    }

    // 5. Fallback Broad Match (Phone, Name, or Partial Email)
    if (!appData) {
      const { data } = await admin
        .from("admissions_applications")
        .select("*")
        .or(`email.ilike.%${rawLookup}%,first_name.ilike.%${rawLookup}%,last_name.ilike.%${rawLookup}%,phone.ilike.%${rawLookup}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) appData = data
    }

    if (!appData) {
      return NextResponse.json({ error: "Application not found. Please check your reference ID or email." }, { status: 404 })
    }

    // Safely Enrich with Institution, Program, Intake, Documents & Offer Letters
    let institution = null
    if (appData.institution_id) {
      const { data: inst } = await admin
        .from("institutions")
        .select("id, name, domain")
        .eq("id", appData.institution_id)
        .maybeSingle()
      institution = inst
    }

    let program = null
    if (appData.program_id) {
      const { data: prog } = await admin
        .from("programs")
        .select("id, name")
        .eq("id", appData.program_id)
        .maybeSingle()
      program = prog
    }

    let intake = null
    if (appData.intake_id) {
      const { data: intk } = await admin
        .from("intakes")
        .select("id, name, start_date, end_date")
        .eq("id", appData.intake_id)
        .maybeSingle()
      intake = intk
    }

    // Fetch Offer Letters
    const { data: offerLetters } = await admin
      .from("offer_letters")
      .select("id, version, status, course_fees, currency, term_start, rendered_html, signed_at, acceptance_reference")
      .eq("application_id", appData.id)
      .order("created_at", { ascending: false })

    // Fetch Documents
    const { data: documents } = await admin
      .from("admission_documents")
      .select("id, document_name, file_url, status")
      .eq("application_id", appData.id)

    const fullApplication = {
      ...appData,
      reference_number: appData.reference_number || `APP-${new Date(appData.created_at || Date.now()).getFullYear()}-${appData.id.substring(0, 4).toUpperCase()}`,
      institution,
      program,
      intake,
      offer_letters: offerLetters || [],
      admission_documents: documents || [],
    }

    return NextResponse.json({ application: fullApplication })
  } catch (err: any) {
    console.error("Public status check error:", err)
    return NextResponse.json({ error: "Failed to retrieve application status" }, { status: 500 })
  }
}

// POST: Public applicant accepts or declines offer with digital signature
export async function POST(request: NextRequest) {
  try {
    const admin = createSupabaseAdminClient()
    const body = await request.json()
    const targetAppId = body.applicationId || body.application_id || body.id
    const decision = body.decision
    const signatureDataUrl = body.signatureDataUrl || body.signature_data_url
    const signerName = body.signerName || body.signer_name
    const offerLetterId = body.offerLetterId || body.offer_letter_id

    if (!targetAppId || !decision) {
      return NextResponse.json({ error: "Application ID and decision are required." }, { status: 400 })
    }

    const rawLookup = String(targetAppId).trim()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLookup)

    let targetId = isUuid ? rawLookup : null
    if (!targetId) {
      try {
        const { data: byRef } = await admin
          .from("admissions_applications")
          .select("id")
          .ilike("reference_number", `%${rawLookup}%`)
          .limit(1)
          .maybeSingle()
        targetId = byRef?.id || null
      } catch {}
    }

    if (!targetId) {
      targetId = rawLookup
    }

    const { data: application, error: appErr } = await admin
      .from("admissions_applications")
      .select("id, institution_id, status, email, first_name, last_name")
      .eq("id", targetId)
      .maybeSingle()

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (application.status !== "OFFER_SENT" && application.status !== "OFFER_ACCEPTED") {
      return NextResponse.json(
        { error: `This application is currently in "${application.status.replace("_", " ")}" status. A formal Letter of Offer must be issued before you can sign and accept.` },
        { status: 400 }
      )
    }

    const isAccepting = decision === "accept"
    const newStatus = isAccepting ? "OFFER_ACCEPTED" : "DECLINED"
    const nowIso = new Date().toISOString()
    const acceptanceRef = `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    // 1. Update application status
    await admin
      .from("admissions_applications")
      .update({
        status: newStatus,
        updated_at: nowIso,
      })
      .eq("id", application.id)

    // 2. Update offer letters with signature & acceptance
    try {
      const { error: offerErr } = await admin
        .from("offer_letters")
        .update({
          status: isAccepting ? "ACCEPTED" : "DECLINED",
          signed_at: isAccepting ? nowIso : null,
          acceptance_reference: isAccepting
            ? `${acceptanceRef} - Digital E-Signature: ${signerName || `${application.first_name} ${application.last_name}`} at ${nowIso}`
            : "Declined by applicant",
        })
        .eq("application_id", application.id)

      if (offerErr) {
        console.warn("Retrying offer_letters update with basic status:", offerErr.message)
        await admin
          .from("offer_letters")
          .update({
            status: isAccepting ? "ACCEPTED" : "DECLINED",
          })
          .eq("application_id", application.id)
      }
    } catch (offerUpdateErr) {
      console.warn("Could not update offer_letters table:", offerUpdateErr)
    }

    // 3. Log to status history with a valid actor from users
    try {
      const { data: adminUser } = await admin
        .from("users")
        .select("id")
        .or(`institution_id.eq.${application.institution_id},role.eq.SUPER_ADMIN`)
        .limit(1)
        .maybeSingle()

      if (adminUser?.id) {
        await admin.from("admission_status_history").insert({
          application_id: application.id,
          institution_id: application.institution_id,
          actor_id: adminUser.id,
          prior_status: application.status,
          new_status: newStatus,
          reason: isAccepting
            ? `Offer Letter & Student Agreement signed electronically by ${signerName || `${application.first_name} ${application.last_name}`}. Ref: ${acceptanceRef}`
            : "Offer declined by applicant.",
        })
      }
    } catch (histErr) {
      console.warn("Could not log status history for offer decision:", histErr)
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      acceptance_reference: acceptanceRef,
      message: isAccepting
        ? "Congratulations! Your offer acceptance has been received. The admissions office will now finalize your enrolment and activate your student portal."
        : "Offer declined successfully.",
    })
  } catch (err: any) {
    console.error("Public offer decision error:", err)
    return NextResponse.json({ error: "Failed to submit offer response" }, { status: 500 })
  }
}
