import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { jsPDF } from "jspdf";
import signature from "../../assets/yeshraj_signature.png";

// ── Date helpers ───────────────────────────────────────────────────────────
const formatDisplayDate = (isoStr) => {
  if (!isoStr) return "—";
  const d = new Date(isoStr + "T00:00:00");
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const monthsBetween = (startIso, endIso) => {
  if (!startIso || !endIso) return "";
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T00:00:00");
  if (isNaN(start) || isNaN(end) || end < start) return "";
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(months, 0);
  return `${months} Month${months === 1 ? "" : "s"}`;
};

// ── Certificate PDF ───────────────────────────────────────────────────────────
// dates = { issueDate, startDate, endDate }  (all ISO yyyy-mm-dd, pre-formatted before building)
const buildCertificatePDF = (app, dates, certificateId) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W       = 210;
  const H       = 297;
  const ML      = 20;
  const MR      = 20;
  const CW      = W - ML - MR;
  const FOOTER_Y = H - 14;
  // Safe content zone: y=37 → y=FOOTER_Y-4 = 279  (242mm of usable height)

  const issueDate   = formatDisplayDate(dates.issueDate);
  const periodStart = formatDisplayDate(dates.startDate);
  const periodEnd   = formatDisplayDate(dates.endDate);
  const period      = `${periodStart} – ${periodEnd}`;
  const duration    = monthsBetween(dates.startDate, dates.endDate) || "—";

  const name       = app.name       || "Intern Name";
  const university = app.university || "";
  const degree      = app.degree     || "";
  const role        = "Software Engineer Intern";
  const firstName   = name.split(" ")[0];

  const refNo = certificateId || "PENDING";

  // ── Left accent bar + header band ────────────────────────────────────────
  doc.setFillColor(22, 49, 120);
  doc.rect(0, 0, 8, H, "F");
  doc.rect(0, 0, W, 23, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("LUMBINI TECHNOLOGIES PVT. LTD.", W / 2, 9.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 210, 255);
  doc.text("www.lumbinitechnologies.com  ·  hr@lumbinitechnologies.com  ·  +91 9848294006", W / 2, 15.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 235, 255);
  doc.text("INTERNSHIP COMPLETION & APPRECIATION CERTIFICATE", W / 2, 21, { align: "center" });

  // ── Gold rule ─────────────────────────────────────────────────────────────
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.8);
  doc.line(ML, 25, W - MR, 25);

  // ── Ref / Date row ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Certificate No.: ${refNo}`, ML, 31);
  doc.text(`Date of Issue: ${issueDate}`, W - MR, 31, { align: "right" });

  // ── Recipient block ───────────────────────────────────────────────────────
  let y = 39;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(name, ML, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  if (university) { doc.text(university, ML, y); y += 4; }
  if (degree)     { doc.text(degree,     ML, y); y += 4; }
  y += 7;

  // ── Intro paragraph ───────────────────────────────────────────────────────
  const para0 =
    `This is to certify that ${name} has successfully completed the internship programme as a ${role} ` +
    `with Lumbini Technologies Private Limited, from ${periodStart} to ${periodEnd}.`;
  doc.setFontSize(10);
  doc.splitTextToSize(para0, CW).forEach((l) => { doc.text(l, ML, y); y += 5.2; });
  y += 5;

  // ── Internship details table ───────────────────────────────────────────────
  const COL1  = 52;
  const ROW_H = 6.5;
  const rows  = [
    ["Position",          role],
    ["Department",        "Engineering & Product"],
    ["Reporting To",      "Project Mentor / Team Lead"],
    ["Internship Period", period],
    ["Duration",          duration],
    ["Date of Completion", periodEnd],
  ];
  const TABLE_H = rows.length * ROW_H + 8;

  doc.setFillColor(246, 248, 254);
  doc.setDrawColor(210, 220, 245);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, TABLE_H, 2, 2, "FD");

  doc.setFillColor(22, 49, 120);
  doc.roundedRect(ML, y, CW, 8, 2, 2, "F");
  doc.rect(ML, y + 4, CW, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("INTERNSHIP DETAILS", ML + CW / 2, y + 6, { align: "center" });

  let ry = y + 12;
  rows.forEach(([key, val], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(237, 241, 252);
      doc.rect(ML + 0.5, ry - 4, CW - 1, ROW_H, "F");
    }
    doc.setDrawColor(210, 220, 245);
    doc.setLineWidth(0.25);
    doc.line(ML + COL1, ry - 4, ML + COL1, ry + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(50, 60, 100);
    doc.text(key, ML + 3, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(25, 25, 25);
    doc.text(val, ML + COL1 + 3, ry);
    if (i < rows.length - 1) {
      doc.setDrawColor(215, 225, 248);
      doc.line(ML + 0.5, ry + 3, ML + CW - 0.5, ry + 3);
    }
    ry += ROW_H;
  });
  y += TABLE_H + 10;

  // ── Key Contributions ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(22, 49, 120);
  const sectionTitle = "Key Contributions & Achievements";
  doc.text(sectionTitle, ML, y);
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.5);
  doc.line(ML, y + 1.5, ML + doc.getTextWidth(sectionTitle), y + 1.5);
  y += 7;

  const highlights = [
    `Contributed to the design, development, testing, and maintenance of production software modules across multiple project cycles as a ${role}.`,
    "Developed and integrated software features using modern engineering practices and tools.",
    "Participated in debugging, code reviews, and deployment activities alongside the engineering team.",
    "Collaborated with cross-functional team members using Agile/Scrum practices and sprint-based development.",
    "Demonstrated strong ownership, problem-solving ability, and commitment to meeting project requirements and deadlines.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  highlights.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, CW - 7);
    doc.text("•", ML + 1, y);
    wrapped.forEach((line, li) => { doc.text(line, ML + 5, y + li * 4.8); });
    y += wrapped.length * 4.8 + 2;
  });
  y += 3;

  // ── Closing paragraph ─────────────────────────────────────────────────────
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  const closing =
    `The management and team at Lumbini Technologies Pvt. Ltd. sincerely appreciate ${name}'s dedication, ` +
    `professionalism, and valuable contributions throughout the internship. We wish ${firstName} continued success ` +
    `in the journey ahead.`;
  doc.splitTextToSize(closing, CW).forEach((l) => { doc.text(l, ML, y); y += 4.8; });
  y += 7;

  // ── Signature block ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("For Lumbini Technologies Pvt. Ltd.", ML, y);
  y += 5;

  doc.addImage(signature, "PNG", ML - 8, y, 42, 14);
  y += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 49, 120);
  doc.text("Yeshraj Maganti", ML, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text("CEO & Talent Acquisition", ML, y);
  y += 4.5;
  doc.text("Lumbini Technologies Pvt. Ltd.", ML, y);

  // ── Public verification link ─────────────────────────────────────────────
  if (certificateId) {
    const verificationUrl = `https://www.lumbinitechnologies.com/verify-certificate/${encodeURIComponent(certificateId)}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(22, 49, 120);
    const verificationText = `Verify online: ${verificationUrl}`;
    const verificationX = W / 2;
    const verificationY = FOOTER_Y - 4;
    doc.text(verificationText, verificationX, verificationY, { align: "center" });
    doc.link(
      verificationX - doc.getTextWidth(verificationText) / 2,
      verificationY - 4,
      doc.getTextWidth(verificationText),
      5,
      { url: verificationUrl }
    );
  }

  // ── Footer band ───────────────────────────────────────────────────────────
  doc.setFillColor(13, 32, 96);
  doc.rect(0, FOOTER_Y, W, 14, "F");
  doc.setDrawColor(80, 110, 200);
  doc.setLineWidth(0.4);
  doc.line(W / 2 + 5, FOOTER_Y + 2.5, W / 2 + 5, FOOTER_Y + 11.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(200, 220, 255);
  doc.text("Flat No. 9, 3rd Floor, A Block, Sarvani Towers,", 12, FOOTER_Y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 190, 240);
  doc.text("Siddhartha Nagar, Vijayawada – 520010", 12, FOOTER_Y + 10.5);

  const fRX = W / 2 + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("+91 9848294006", fRX, FOOTER_Y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 190, 240);
  doc.text("hr@lumbinitechnologies.com", fRX, FOOTER_Y + 10.5);

  return doc;
};

// ── Offer Letter PDF ──────────────────────────────────────────────────────────
// dates = { issueDate, startDate, duration }  (issueDate/startDate are ISO yyyy-mm-dd, duration is free text e.g. "2 Months")
const buildOfferLetterPDF = (app, dates) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const ML = 20;
  const MR = 20;
  const CW = W - ML - MR;
  const FOOTER_Y = H - 14;

  const issueDate = formatDisplayDate(dates.issueDate);
  const startDate = formatDisplayDate(dates.startDate);
  const duration  = dates.duration || "—";
  const refNo = `LT/OL/${new Date().getFullYear()}/${String(app.id || "001").slice(-4).padStart(4, "0")}`;

  doc.setFillColor(22, 49, 120);
  doc.rect(0, 0, 8, H, "F");
  doc.rect(0, 0, W, 23, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("LUMBINI TECHNOLOGIES PVT. LTD.", W / 2, 9.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 210, 255);
  doc.text("www.lumbinitechnologies.com  ·  hr@lumbinitechnologies.com  ·  +91 9848294006", W / 2, 15.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(220, 235, 255);
  doc.text("OFFER OF INTERNSHIP", W / 2, 21, { align: "center" });

  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.8);
  doc.line(ML, 25, W - MR, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Ref: ${refNo}`, ML, 31);
  doc.text(`Date: ${issueDate}`, W - MR, 31, { align: "right" });

  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(app.name || "Candidate Name", ML, y); y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  if (app.email)      { doc.text(app.email,      ML, y); y += 3.8; }
  if (app.phone)      { doc.text(app.phone,      ML, y); y += 3.8; }
  if (app.university) { doc.text(app.university, ML, y); y += 3.8; }
  if (app.degree)     { doc.text(app.degree,     ML, y); y += 3.8; }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 49, 120);
  const subject = "Subject: Offer of Internship — Software Engineer Intern";
  doc.text(subject, ML, y);
  doc.setDrawColor(22, 49, 120);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 1, ML + doc.getTextWidth(subject), y + 1);
  y += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`Dear ${(app.name || "Candidate").split(" ")[0]},`, ML, y);
  y += 5.5;

  const para1 = `We are pleased to offer you the position of Software Engineer Intern at Lumbini Technologies Private Limited. Based on our evaluation of your application, we believe your skills and enthusiasm will contribute positively to our team and provide practical exposure to real-world software development.`;
  doc.setFontSize(9.5);
  doc.splitTextToSize(para1, CW).forEach((l) => { doc.text(l, ML, y); y += 4.8; });
  y += 3;

  const COL1 = 48;
  const ROW_H = 6.5;
  const rows = [
    ["Position",     "Software Engineer Intern"],
    ["Department",   "Engineering & Product"],
    ["Reporting To", "Project Mentor / Team Lead"],
    ["Duration",     duration],
    ["Mode",         "Hybrid / As Mutually Discussed"],
    ["Stipend",      "As per internship policy"],
    ["Start Date",   startDate],
  ];
  const TABLE_H = rows.length * ROW_H + 9;

  doc.setFillColor(246, 248, 254);
  doc.setDrawColor(210, 220, 245);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, TABLE_H, 2, 2, "FD");

  doc.setFillColor(22, 49, 120);
  doc.roundedRect(ML, y, CW, 8, 2, 2, "F");
  doc.rect(ML, y + 4, CW, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("INTERNSHIP DETAILS", ML + CW / 2, y + 6, { align: "center" });

  let ry = y + 12;
  rows.forEach(([key, val], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(237, 241, 252);
      doc.rect(ML + 0.5, ry - 4, CW - 1, ROW_H, "F");
    }
    doc.setDrawColor(210, 220, 245);
    doc.setLineWidth(0.25);
    doc.line(ML + COL1, ry - 4, ML + COL1, ry + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(50, 60, 100);
    doc.text(key, ML + 3, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(25, 25, 25);
    doc.text(val, ML + COL1 + 3, ry);
    if (i < rows.length - 1) {
      doc.setDrawColor(215, 225, 248);
      doc.line(ML + 0.5, ry + 3, ML + CW - 0.5, ry + 3);
    }
    ry += ROW_H;
  });
  y += TABLE_H + 9;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 49, 120);
  doc.text("Key Responsibilities", ML, y);
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.5);
  doc.line(ML, y + 1.2, ML + 44, y + 1.2);
  y += 7.5;

  const responsibilities = [
    "Assist the engineering team in developing, testing, and maintaining software applications.",
    "Participate in project discussions, sprint planning, and technical reviews.",
    "Write clean, maintainable, and well-documented code following team standards.",
    "Collaborate with mentors and team members to deliver assigned tasks on time.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  responsibilities.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, CW - 7);
    doc.text("•", ML + 1, y);
    wrapped.forEach((line, li) => { doc.text(line, ML + 5, y + li * 4.8); });
    y += wrapped.length * 4.8 + 1.8;
  });
  y += 3.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 49, 120);
  doc.text("Terms & Conditions", ML, y);
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.5);
  doc.line(ML, y + 1.2, ML + 42, y + 1.2);
  y += 7.5;

  const terms = [
    "The internship is for learning and training purposes and does not constitute an employment contract.",
    "The intern must maintain strict confidentiality regarding all company information and intellectual property.",
    "All work produced during the internship will remain the property of Lumbini Technologies Private Limited.",
    "Professional conduct, punctuality, and adherence to company policies are expected throughout the internship.",
    "A Certificate of Internship will be issued upon successful completion of the internship program.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  terms.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, CW - 7);
    doc.text("•", ML + 1, y);
    wrapped.forEach((line, li) => { doc.text(line, ML + 5, y + li * 4.8); });
    y += wrapped.length * 4.8 + 1.8;
  });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("For Lumbini Technologies Pvt. Ltd.", ML, y);
  y += 6;

  doc.addImage(signature, "PNG", ML - 8, y, 42, 14);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 49, 120);
  doc.text("Yeshraj Maganti", ML, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text("CEO & Talent Acquisition", ML, y);
  y += 4.5;
  doc.text("Lumbini Technologies Pvt. Ltd.", ML, y);

  doc.setFillColor(13, 32, 96);
  doc.rect(0, FOOTER_Y, W, 14, "F");
  doc.setDrawColor(80, 110, 200);
  doc.setLineWidth(0.4);
  doc.line(W / 2 + 5, FOOTER_Y + 2.5, W / 2 + 5, FOOTER_Y + 11.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(200, 220, 255);
  doc.text("Flat No. 9, 3rd Floor, A Block, Sarvani Towers,", 12, FOOTER_Y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 190, 240);
  doc.text("Siddhartha Nagar, Vijayawada – 520010", 12, FOOTER_Y + 10.5);

  const fRX = W / 2 + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("+91 9848294006", fRX, FOOTER_Y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 190, 240);
  doc.text("hr@lumbinitechnologies.com", fRX, FOOTER_Y + 10.5);

  return doc;
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  shortlisted: { label: "Shortlisted", color: "#facc15", bg: "rgba(250,204,21,0.12)"  },
  selected:    { label: "Selected",    color: "#39ff14", bg: "rgba(57,255,20,0.10)"   },
  rejected:    { label: "Rejected",    color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

// ── Supabase helpers ──────────────────────────────────────────────────────────
const getOrCreateIntern = async (app) => {
  const { data: existing } = await supabase
    .from("interns")
    .select("id")
    .eq("application_id", app.id)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("interns")
    .insert({
      application_id: app.id,
      user_id:        app.user_id,
      name:           app.name,
      email:          app.email,
      start_date:     new Date().toISOString().split("T")[0],
      end_date:       null,
    })
    .select("id")
    .single();
  if (error) throw new Error("Could not create intern record: " + error.message);
  return created.id;
};

const getExistingInternId = async (applicationId) => {
  const { data } = await supabase
    .from("interns")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  return data?.id ?? null;
};

const uploadAndSaveDocument = async (pdfBlob, _fileName, internId, documentType, certificateId = null) => {
  const fixedFileName = documentType === "offer_letter" ? "offer_letter.pdf" : "certificate.pdf";
  const path = `${internId}/${documentType}/${fixedFileName}`;

  await supabase.storage.from("documents").remove([path]);

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true, cacheControl: "0" });
  if (uploadError) throw new Error("Upload failed: " + uploadError.message);

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
  const fileUrl = urlData?.publicUrl;

  const { error: documentError } = await supabase.from("documents").upsert({
    intern_id: internId,
    document_type: documentType,
    file_url: fileUrl,
    certificate_id: certificateId,
  }, { onConflict: "intern_id,document_type" });
  if (documentError) throw new Error("Could not save document record: " + documentError.message);
  return fileUrl;
};

// ── Date Modal ─────────────────────────────────────────────────────────────
// type: "offer" | "certificate"
// onConfirm(dates) where dates shape depends on type
const DocumentDateModal = ({ type, applicantName, onCancel, onConfirm }) => {
  const today = new Date().toISOString().split("T")[0];

  // Offer letter fields
  const [issueDate, setIssueDate] = useState(today);
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration]   = useState("2 Months");

  // Certificate fields
  const [certIssueDate, setCertIssueDate] = useState(today);
  const [periodStart, setPeriodStart]     = useState("");
  const [periodEnd, setPeriodEnd]         = useState("");

  const isOffer = type === "offer";
  const computedDuration = !isOffer ? monthsBetween(periodStart, periodEnd) : "";

  const canSubmit = isOffer
    ? issueDate && startDate && duration.trim()
    : certIssueDate && periodStart && periodEnd;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isOffer) {
      onConfirm({ issueDate, startDate, duration: duration.trim() });
    } else {
      onConfirm({ issueDate: certIssueDate, startDate: periodStart, endDate: periodEnd });
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onCancel}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-title">
          {isOffer ? "Offer Letter — Dates" : "Certificate — Dates"}
        </div>
        <div className="adm-modal-sub">{applicantName}</div>

        {isOffer ? (
          <>
            <div className="adm-modal-field">
              <label>Issue Date</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="adm-modal-field">
              <label>Internship Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="adm-modal-field">
              <label>Duration</label>
              <input
                type="text"
                placeholder="e.g. 2 Months"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="adm-modal-field">
              <label>Issue / Completion Date</label>
              <input type="date" value={certIssueDate} onChange={(e) => setCertIssueDate(e.target.value)} />
            </div>
            <div className="adm-modal-field">
              <label>Internship Period — Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="adm-modal-field">
              <label>Internship Period — End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            {computedDuration && (
              <div className="adm-modal-hint">Duration: {computedDuration}</div>
            )}
          </>
        )}

        <div className="adm-modal-actions">
          <button className="adm-modal-btn adm-modal-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="adm-modal-btn adm-modal-confirm"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [sending, setSending] = useState(null);
  const [toast, setToast] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [dateModal, setDateModal] = useState(null); // "offer" | "certificate" | null

  const [totalVisitors, setTotalVisitors] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [todayVisitors, setTodayVisitors]  = useState(0);

  useEffect(() => {
    fetchApplications();
    fetchVisitorStats();
  }, []);

  const fetchVisitorStats = async () => {
    try {
      const { count: total } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true });
      setTotalVisitors(total || 0);

      const { data: ipData } = await supabase.from("visitors").select("ip_address");
      if (ipData) setUniqueVisitors(new Set(ipData.map((v) => v.ip_address)).size);

      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .gte("visited_at", today);
      setTodayVisitors(todayCount || 0);
    } catch (e) {
      console.warn("Visitor stats error:", e.message);
    }
  };

  useEffect(() => {
    if (!selected) { setDocuments([]); return; }
    const fetchDocs = async () => {
      try {
        const internId = await getExistingInternId(selected.id);
        if (!internId) { setDocuments([]); return; }
        const { data } = await supabase.from("documents").select("*").eq("intern_id", internId);
        setDocuments(data || []);
      } catch { setDocuments([]); }
    };
    fetchDocs();
  }, [selected]);

  const fetchApplications = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { setApplications([]); setLoadError(error.message); }
      else setApplications(data || []);
    } catch (e) {
      setApplications([]);
      setLoadError(e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id + status);
    await supabase.from("applications").update({ status }).eq("id", id);
    if (status === "selected") {
      const app = applications.find((a) => a.id === id);
      if (app) {
        try { await getOrCreateIntern({ ...app, status: "selected" }); }
        catch (e) { console.warn("Could not create intern:", e.message); }
      }
    }
    await fetchApplications();
    if (selected?.id === id) setSelected((prev) => ({ ...prev, status }));
    setUpdating(null);
    showToast("Marked as " + status);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Step 1: user clicks "Generate Offer Letter" / "Generate Certificate" → open date modal
  const openDateModal = (type) => {
    if (!selected) return;
    setDateModal(type);
  };

  // Step 2: user fills dates in modal and confirms → actually build + save the PDF
  const handleGenerateDocument = async (type, dates) => {
    if (!selected) return;
    setDateModal(null);
    setSending(`${selected.id}:${type}`);
    try {
      const internId = await getExistingInternId(selected.id);
      if (!internId) {
        showToast(`${type === "offer" ? "Offer Letter" : "Certificate"} cannot be saved until the applicant is selected.`);
        return;
      }

      let certificate = null;
      if (type === "certificate") {
        const { data, error } = await supabase.rpc("issue_certificate", {
          p_intern_id: internId,
          p_issue_date: dates.issueDate,
          p_period_start: dates.startDate,
          p_period_end: dates.endDate,
        });
        if (error) throw new Error("Could not issue certificate: " + error.message);
        certificate = data?.[0];
        if (!certificate?.certificate_id) throw new Error("Certificate number was not issued.");
      }

      const doc = type === "offer"
        ? buildOfferLetterPDF(selected, dates)
        : buildCertificatePDF(selected, dates, certificate.certificate_id);
      const labelMap = { offer: "Offer_Letter", certificate: "Certificate" };
      const downloadName = `${selected.name?.replace(/\s+/g, "_")}_${labelMap[type]}.pdf`;
      doc.save(`${Date.now()}_${downloadName}`);
      try {
        const pdfBlob = doc.output("blob");
        const docTypeMap = { offer: "offer_letter", certificate: "certificate" };
        await uploadAndSaveDocument(
          pdfBlob,
          downloadName,
          internId,
          docTypeMap[type],
          certificate?.certificate_id || null
        );
        const { data: freshDocs } = await supabase.from("documents").select("*").eq("intern_id", internId);
        setDocuments(freshDocs || []);
        showToast(`${labelMap[type].replace("_", " ")} downloaded & saved ✓`);
      } catch {
        showToast(`${labelMap[type].replace("_", " ")} downloaded ✓`);
      }
    } catch {
      showToast("Failed to generate document.");
    } finally {
      setSending(null);
    }
  };

  const filtered = applications.filter((a) => {
    const matchSearch =
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.university?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === "all" || a.status === filter);
  });

  const counts = {
    all:         applications.length,
    pending:     applications.filter((a) => a.status === "pending").length,
    shortlisted: applications.filter((a) => a.status === "shortlisted").length,
    selected:    applications.filter((a) => a.status === "selected").length,
    rejected:    applications.filter((a) => a.status === "rejected").length,
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .adm {
          min-height: 100vh;
          background: transparent;
          color: #e2e8f0;
          font-family: 'Syne', sans-serif;
          padding-top: 70px;
        }

        /* ── Topbar ── */
        .adm-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 36px; border-bottom: 1px solid rgba(250,204,21,0.08);
          background: rgba(4, 4, 4, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          position: sticky; top: 70px; z-index: 50;
        }
        .adm-logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 1rem; font-weight: 800; color: #fff; letter-spacing: 0.04em;
        }
        .adm-logo-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #facc15; box-shadow: 0 0 10px rgba(250,204,21,0.6);
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }

        .adm-topbar-right { display: flex; gap: 10px; align-items: center; }

        .adm-analytics-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(250,204,21,0.08); border: 1px solid rgba(250,204,21,0.25);
          color: #facc15; font-size: 12px; font-family: 'JetBrains Mono', monospace;
          font-weight: 700; padding: 8px 16px; border-radius: 8px; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .adm-analytics-btn:hover {
          background: rgba(250,204,21,0.15); border-color: #facc15;
          box-shadow: 0 0 20px rgba(250,204,21,0.15);
        }
        .adm-analytics-btn-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #facc15; animation: pulse 1.5s infinite;
        }
        .adm-refresh-btn {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          color: #64748b; font-size: 13px; font-family: 'JetBrains Mono', monospace;
          padding: 7px 14px; border-radius: 6px; cursor: pointer; transition: all 0.2s;
        }
        .adm-refresh-btn:hover { color: #facc15; border-color: rgba(250,204,21,0.25); }

        /* ── Body ── */
        .adm-body { padding: 32px 36px; max-width: 1400px; margin: 0 auto; }

        .adm-section-label {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          color: rgba(255,255,255,0.15); text-transform: uppercase;
          letter-spacing: .12em; margin-bottom: 10px; margin-top: 4px;
        }

        /* ── Visitor strip ── */
        .adm-visitor-strip {
          display: grid; grid-template-columns: repeat(3,1fr) auto;
          gap: 12px; margin-bottom: 28px; align-items: stretch;
        }
        .adm-visitor-card {
          background: rgba(250,204,21,0.04); border: 1px solid rgba(250,204,21,0.12);
          border-radius: 10px; padding: 14px 20px;
          display: flex; align-items: center; gap: 14px;
        }
        .adm-visitor-icon { font-size: 1.4rem; line-height: 1; }
        .adm-visitor-label {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          color: rgba(250,204,21,0.45); text-transform: uppercase;
          letter-spacing: .1em; margin-bottom: 3px;
        }
        .adm-visitor-num { font-size: 1.5rem; font-weight: 800; color: #facc15; line-height: 1; }

        .adm-analytics-card {
          background: linear-gradient(135deg, rgba(250,204,21,0.08), rgba(250,204,21,0.03));
          border: 1px solid rgba(250,204,21,0.2); border-radius: 10px;
          padding: 14px 20px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; transition: all 0.25s; min-width: 140px;
        }
        .adm-analytics-card:hover {
          background: linear-gradient(135deg, rgba(250,204,21,0.15), rgba(250,204,21,0.06));
          border-color: #facc15; box-shadow: 0 0 30px rgba(250,204,21,0.12);
          transform: translateY(-1px);
        }
        .adm-analytics-card-icon { font-size: 1.6rem; }
        .adm-analytics-card-label {
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: #facc15; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; text-align: center;
        }
        .adm-analytics-card-sub {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          color: rgba(250,204,21,0.35); text-align: center;
        }

        /* ── Application stats ── */
        .adm-stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 28px; }
        .adm-stat {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px; padding: 16px 20px; cursor: pointer;
          transition: all 0.2s; position: relative; overflow: hidden;
        }
        .adm-stat::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 2px; background: var(--accent); opacity: 0; transition: opacity 0.2s;
        }
        .adm-stat:hover::before, .adm-stat.active::before { opacity: 1; }
        .adm-stat:hover, .adm-stat.active {
          border-color: var(--accent-dim); background: rgba(255,255,255,0.04);
        }
        .adm-stat-label {
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: rgba(255,255,255,0.25); text-transform: uppercase;
          letter-spacing: .1em; margin-bottom: 6px;
        }
        .adm-stat-num { font-size: 2rem; font-weight: 800; color: var(--accent); line-height: 1; }

        /* ── Controls ── */
        .adm-controls { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; }
        .adm-search {
          flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px; padding: 10px 16px; color: #e2e8f0;
          font-size: 14px; font-family: 'Syne', sans-serif;
          outline: none; transition: border-color 0.2s;
        }
        .adm-search::placeholder { color: rgba(255,255,255,0.15); }
        .adm-search:focus { border-color: rgba(250,204,21,0.3); }
        .adm-count {
          font-family: 'JetBrains Mono', monospace; font-size: 13px;
          color: rgba(255,255,255,0.2); white-space: nowrap;
        }

        /* ── Table ── */
        .adm-table-wrap {
          background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; overflow: hidden;
        }
        .adm-table { width: 100%; border-collapse: collapse; }
        .adm-table thead tr {
          background: rgba(255,255,255,0.025);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .adm-table th {
          padding: 12px 16px; text-align: left; font-size: 11px;
          font-family: 'JetBrains Mono', monospace; color: rgba(255,255,255,0.2);
          text-transform: uppercase; letter-spacing: .1em; font-weight: 600;
        }
        .adm-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer; transition: background 0.15s;
        }
        .adm-table tbody tr:last-child { border-bottom: none; }
        .adm-table tbody tr:hover { background: rgba(250,204,21,0.03); }
        .adm-table tbody tr.row-selected { background: rgba(250,204,21,0.05); }
        .adm-table td { padding: 13px 16px; font-size: 14px; color: #94a3b8; vertical-align: middle; }
        .adm-name { font-weight: 700; color: #e2e8f0; font-size: 14px; }
        .adm-email {
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
          color: rgba(255,255,255,0.25);
        }

        /* ── Badges & action buttons ── */
        .adm-status-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
          border-radius: 999px; font-size: 12px; font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          background: var(--sbg); color: var(--sc); white-space: nowrap;
        }
        .adm-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sc); }

        .adm-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .adm-action-btn {
          padding: 5px 11px; border-radius: 6px; font-size: 11px;
          font-family: 'JetBrains Mono', monospace; font-weight: 600;
          border: 1px solid transparent; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .adm-action-btn:disabled { opacity: .4; cursor: not-allowed; }

        .btn-shortlist { background: rgba(250,204,21,.08); border-color: rgba(250,204,21,.2); color: #facc15; }
        .btn-shortlist:hover:not(:disabled) { background: rgba(250,204,21,.16); border-color: #facc15; }
        .btn-select { background: rgba(57,255,20,.08); border-color: rgba(57,255,20,.2); color: #39ff14; }
        .btn-select:hover:not(:disabled) { background: rgba(57,255,20,.16); border-color: #39ff14; }
        .btn-reject { background: rgba(248,113,113,.08); border-color: rgba(248,113,113,.2); color: #f87171; }
        .btn-reject:hover:not(:disabled) { background: rgba(248,113,113,.16); border-color: #f87171; }
        .btn-offer { background: rgba(59,130,246,.08); border-color: rgba(59,130,246,.2); color: #60a5fa; }
        .btn-offer:hover:not(:disabled) { background: rgba(59,130,246,.16); border-color: #60a5fa; }
        .btn-certificate { background: rgba(251,146,60,.08); border-color: rgba(251,146,60,.2); color: #fb923c; }
        .btn-certificate:hover:not(:disabled) { background: rgba(251,146,60,.16); border-color: #fb923c; }

        /* ── Empty / loading ── */
        .adm-empty {
          text-align: center; padding: 60px 20px;
          color: rgba(255,255,255,0.1); font-family: 'JetBrains Mono', monospace; font-size: 13px;
        }
        .adm-loading {
          text-align: center; padding: 60px; color: #facc15;
          font-family: 'JetBrains Mono', monospace; font-size: 13px; animation: flicker 1.2s infinite;
        }
        @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:.4} }

        /* ── Drawer ── */
        .adm-drawer-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.75);
          z-index: 100; backdrop-filter: blur(4px);
        }
        .adm-drawer {
          position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
          background: #060a0f; border-left: 1px solid rgba(250,204,21,0.1);
          z-index: 101; overflow-y: auto; padding: 28px 28px 48px;
          animation: slideIn .25s ease;
        }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }

        .adm-drawer-close {
          position: absolute; top: 16px; right: 20px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.3); width: 30px; height: 30px;
          border-radius: 6px; cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .adm-drawer-close:hover { color: #f87171; border-color: rgba(248,113,113,0.3); }
        .adm-drawer-name { font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 4px; padding-right: 36px; }
        .adm-drawer-email {
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
          color: rgba(255,255,255,0.25); margin-bottom: 20px;
        }
        .adm-drawer-section { margin-bottom: 20px; }
        .adm-drawer-section-title {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          color: rgba(57,255,20,0.35); text-transform: uppercase;
          letter-spacing: .15em; margin-bottom: 10px; padding-bottom: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .adm-drawer-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px; }
        .adm-drawer-key { font-size: 12px; color: rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }
        .adm-drawer-val { font-size: 13px; color: #64748b; text-align: right; word-break: break-word; }
        .adm-drawer-answer {
          font-size: 13px; color: #475569; line-height: 1.6;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px; padding: 12px 14px; margin-top: 6px;
        }
        .adm-drawer-resume-btn {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
          padding: 8px 14px; background: rgba(250,204,21,.08);
          border: 1px solid rgba(250,204,21,.25); border-radius: 6px; color: #facc15;
          font-size: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 600;
          text-decoration: none; transition: all 0.2s;
        }
        .adm-drawer-resume-btn:hover { background: rgba(250,204,21,.15); border-color: #facc15; }
        .adm-drawer-actions { display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap; }
        .adm-drawer-actions .adm-action-btn { flex: 1; padding: 9px 12px; font-size: 12px; text-align: center; }

        .adm-docs-divider {
          font-size: 9px; font-family: 'JetBrains Mono', monospace;
          color: rgba(57,255,20,0.35); text-transform: uppercase;
          letter-spacing: .15em; margin: 16px 0 10px;
          padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .adm-docs-gate {
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: rgba(255,255,255,0.2); padding: 10px 0;
        }

        /* ── Toast ── */
        .adm-toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: #facc15; color: #000; font-family: 'JetBrains Mono', monospace;
          font-size: 13px; font-weight: 700; padding: 10px 22px;
          border-radius: 999px; z-index: 200; animation: toastIn .3s ease; white-space: nowrap;
        }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        /* ── Date Modal ── */
        .adm-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.8);
          z-index: 300; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px); padding: 20px;
        }
        .adm-modal {
          background: #0a0e14; border: 1px solid rgba(250,204,21,0.15);
          border-radius: 14px; padding: 26px; width: 100%; max-width: 360px;
          animation: modalIn .2s ease;
        }
        @keyframes modalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        .adm-modal-title {
          font-size: 1.05rem; font-weight: 800; color: #fff; margin-bottom: 2px;
        }
        .adm-modal-sub {
          font-size: 12px; font-family: 'JetBrains Mono', monospace;
          color: rgba(255,255,255,0.3); margin-bottom: 18px;
        }
        .adm-modal-field { margin-bottom: 14px; }
        .adm-modal-field label {
          display: block; font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: rgba(250,204,21,0.55); text-transform: uppercase; letter-spacing: .08em;
          margin-bottom: 6px;
        }
        .adm-modal-field input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 9px 12px; color: #e2e8f0; font-size: 13px;
          font-family: 'Syne', sans-serif; outline: none; transition: border-color 0.2s;
          color-scheme: dark;
        }
        .adm-modal-field input:focus { border-color: rgba(250,204,21,0.4); }
        .adm-modal-hint {
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          color: #39ff14; margin-bottom: 6px; margin-top: -4px;
        }
        .adm-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .adm-modal-btn {
          flex: 1; padding: 10px 14px; border-radius: 8px; font-size: 13px;
          font-family: 'JetBrains Mono', monospace; font-weight: 700;
          border: 1px solid transparent; cursor: pointer; transition: all 0.2s;
        }
        .adm-modal-cancel {
          background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: #94a3b8;
        }
        .adm-modal-cancel:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.2); }
        .adm-modal-confirm {
          background: rgba(250,204,21,0.12); border-color: rgba(250,204,21,0.35); color: #facc15;
        }
        .adm-modal-confirm:hover:not(:disabled) { background: rgba(250,204,21,0.2); border-color: #facc15; }
        .adm-modal-confirm:disabled { opacity: .35; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .adm-stats { grid-template-columns: repeat(3,1fr); }
          .adm-visitor-strip { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 768px) {
          .adm { padding-top: 60px; }
          .adm-topbar { top: 60px; padding: 14px 16px; }
          .adm-body { padding: 20px 16px; }
          .adm-stats { grid-template-columns: repeat(2,1fr); }
          .adm-visitor-strip { grid-template-columns: 1fr; }
          .adm-drawer { width: 100%; }
          .adm-table th:nth-child(3), .adm-table td:nth-child(3) { display: none; }
        }
      `}</style>

      <div className="adm">
        {/* ── Topbar ── */}
        <div className="adm-topbar">
          <div className="adm-logo">
            <div className="adm-logo-dot" />
            Lumbini Admin
          </div>
          <div className="adm-topbar-right">
            <button className="adm-analytics-btn" onClick={() => navigate("/admin-analytics")}>
  <span className="adm-analytics-btn-dot" />
  Analytics
</button>
<button
  className="adm-analytics-btn"
  onClick={() => navigate("/admin/blogs")}
  style={{
    background: "rgba(57,255,20,.07)",
    borderColor: "rgba(57,255,20,.25)",
    color: "#39ff14",
  }}
>
  <span style={{fontSize:"1rem"}}>📝</span>
  Blogs
</button>
<button
  className="adm-analytics-btn"
  onClick={() => navigate("/admin/timesheets")}
  style={{
    background: "rgba(250,204,21,.07)",
    borderColor: "rgba(250,204,21,.25)",
    color: "#facc15",
  }}
>
  <span style={{fontSize:"1rem"}}>⏱️</span>
  Timesheets
</button>
            <button
              className="adm-refresh-btn"
              onClick={() => { fetchApplications(); fetchVisitorStats(); }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="adm-body">

          {/* ── Site Overview ── */}
          <div className="adm-section-label">Site Overview</div>
          <div className="adm-visitor-strip">
            <div className="adm-visitor-card">
              <div className="adm-visitor-icon">👁️</div>
              <div>
                <div className="adm-visitor-label">Total Visits</div>
                <div className="adm-visitor-num">{totalVisitors}</div>
              </div>
            </div>
            <div className="adm-visitor-card">
              <div className="adm-visitor-icon">🧑‍💻</div>
              <div>
                <div className="adm-visitor-label">Unique Visitors</div>
                <div className="adm-visitor-num">{uniqueVisitors}</div>
              </div>
            </div>
            <div className="adm-visitor-card">
              <div className="adm-visitor-icon">📅</div>
              <div>
                <div className="adm-visitor-label">Today</div>
                <div className="adm-visitor-num">{todayVisitors}</div>
              </div>
            </div>
            <div className="adm-analytics-card" onClick={() => navigate("/admin-analytics")}>
              <div className="adm-analytics-card-icon">📊</div>
              <div className="adm-analytics-card-label">Deep Analytics</div>
              <div className="adm-analytics-card-sub">Devices · Geo · Timeline</div>
            </div>
          </div>

          {/* ── Applications ── */}
          <div className="adm-section-label">Applications</div>
          <div className="adm-stats">
            {[
              { key: "all",         label: "Total",       accent: "#facc15" },
              { key: "pending",     label: "Pending",     accent: "#6b7280" },
              { key: "shortlisted", label: "Shortlisted", accent: "#facc15" },
              { key: "selected",    label: "Selected",    accent: "#39ff14" },
              { key: "rejected",    label: "Rejected",    accent: "#f87171" },
            ].map(({ key, label, accent }) => (
              <div
                key={key}
                className={"adm-stat" + (filter === key ? " active" : "")}
                style={{ "--accent": accent, "--accent-dim": accent + "33" }}
                onClick={() => setFilter(key)}
              >
                <div className="adm-stat-label">{label}</div>
                <div className="adm-stat-num">{counts[key]}</div>
              </div>
            ))}
          </div>

          <div className="adm-controls">
            <input
              className="adm-search"
              placeholder="Search by name, email, university..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="adm-count">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="adm-table-wrap">
            {loading ? (
              <div className="adm-loading">Loading applications...</div>
            ) : loadError ? (
              <div className="adm-empty">
                // could not load applications
                <div style={{ marginTop: 10, color: "#f87171" }}>{loadError}</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="adm-empty">// no applications found</div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>University</th>
                    <th>Year</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const s = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                    return (
                      <tr
                        key={app.id}
                        className={selected?.id === app.id ? "row-selected" : ""}
                        onClick={() => setSelected(app)}
                      >
                        <td>
                          <div className="adm-name">{app.name || "—"}</div>
                          <div className="adm-email">{app.email}</div>
                        </td>
                        <td>{app.university || "—"}</td>
                        <td>{app.year || "—"}</td>
                        <td>{fmt(app.created_at)}</td>
                        <td>
                          <span
                            className="adm-status-badge"
                            style={{ "--sbg": s.bg, "--sc": s.color }}
                          >
                            <span className="adm-status-dot" />
                            {s.label}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="adm-actions">
                            <button
                              className="adm-action-btn btn-shortlist"
                              disabled={app.status === "shortlisted" || updating === app.id + "shortlisted"}
                              onClick={() => updateStatus(app.id, "shortlisted")}
                            >Shortlist</button>
                            <button
                              className="adm-action-btn btn-select"
                              disabled={app.status === "selected" || updating === app.id + "selected"}
                              onClick={() => updateStatus(app.id, "selected")}
                            >Select</button>
                            <button
                              className="adm-action-btn btn-reject"
                              disabled={app.status === "rejected" || updating === app.id + "rejected"}
                              onClick={() => updateStatus(app.id, "rejected")}
                            >Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Drawer ── */}
      {selected && (() => {
        const s = STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending;
        const isSelected = selected.status === "selected";
        const offerDoc = documents.find((d) => d.document_type === "offer_letter");
        const certDoc  = documents.find((d) => d.document_type === "certificate");
        return (
          <>
            <div className="adm-drawer-overlay" onClick={() => setSelected(null)} />
            <div className="adm-drawer">
              <button className="adm-drawer-close" onClick={() => setSelected(null)}>✕</button>

              <div className="adm-drawer-name">{selected.name || "—"}</div>
              <div className="adm-drawer-email">{selected.email}</div>

              <span
                className="adm-status-badge"
                style={{ "--sbg": s.bg, "--sc": s.color, marginBottom: "20px", display: "inline-flex" }}
              >
                <span className="adm-status-dot" />
                {s.label}
              </span>

              <div className="adm-drawer-section">
                <div className="adm-drawer-section-title">Personal</div>
                <div className="adm-drawer-row">
                  <span className="adm-drawer-key">Phone</span>
                  <span className="adm-drawer-val">{selected.phone || "—"}</span>
                </div>
                <div className="adm-drawer-row">
                  <span className="adm-drawer-key">Applied</span>
                  <span className="adm-drawer-val">{fmt(selected.created_at)}</span>
                </div>
              </div>

              <div className="adm-drawer-section">
                <div className="adm-drawer-section-title">Education</div>
                <div className="adm-drawer-row">
                  <span className="adm-drawer-key">University</span>
                  <span className="adm-drawer-val">{selected.university || "—"}</span>
                </div>
                <div className="adm-drawer-row">
                  <span className="adm-drawer-key">Degree</span>
                  <span className="adm-drawer-val">{selected.degree || "—"}</span>
                </div>
                <div className="adm-drawer-row">
                  <span className="adm-drawer-key">Year</span>
                  <span className="adm-drawer-val">{selected.year || "—"}</span>
                </div>
              </div>

              {selected.skills && (
                <div className="adm-drawer-section">
                  <div className="adm-drawer-section-title">Skills</div>
                  <div className="adm-drawer-val" style={{ textAlign: "left" }}>{selected.skills}</div>
                </div>
              )}

              {selected.motivation && (
                <div className="adm-drawer-section">
                  <div className="adm-drawer-section-title">Why this internship?</div>
                  <div className="adm-drawer-answer">{selected.motivation}</div>
                </div>
              )}

              {selected.resume_url && (
                <div className="adm-drawer-section">
                  <div className="adm-drawer-section-title">Resume</div>
                  <a
                    href={selected.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-drawer-resume-btn"
                  >
                    ↗ View Resume (PDF)
                  </a>
                </div>
              )}

              <div className="adm-drawer-actions">
                <button
                  className="adm-action-btn btn-shortlist"
                  disabled={selected.status === "shortlisted" || !!updating}
                  onClick={() => updateStatus(selected.id, "shortlisted")}
                >Shortlist</button>
                <button
                  className="adm-action-btn btn-select"
                  disabled={selected.status === "selected" || !!updating}
                  onClick={() => updateStatus(selected.id, "selected")}
                >Select</button>
                <button
                  className="adm-action-btn btn-reject"
                  disabled={selected.status === "rejected" || !!updating}
                  onClick={() => updateStatus(selected.id, "rejected")}
                >Reject</button>
              </div>

              <div className="adm-docs-divider">Documents</div>

              {!isSelected ? (
                <div className="adm-docs-gate">// Select applicant to unlock document generation</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Offer Letter */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="adm-action-btn btn-offer"
                      style={{ flex: 1 }}
                      disabled={!!sending}
                      onClick={() => openDateModal("offer")}
                    >
                      {sending === `${selected.id}:offer`
                        ? "Generating..."
                        : offerDoc ? "↺ Regenerate Offer Letter" : "Generate Offer Letter"}
                    </button>
                    {offerDoc && (
                      <a
                        href={offerDoc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="adm-action-btn"
                        style={{
                          background: "rgba(96,165,250,0.07)",
                          border: "1px solid rgba(96,165,250,0.2)",
                          color: "#60a5fa", textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >↗ View</a>
                    )}
                  </div>
                  {offerDoc && (
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#39ff14", paddingLeft: 2 }}>
                      ✓ Offer Letter generated
                    </div>
                  )}

                  {/* Certificate */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="adm-action-btn btn-certificate"
                      style={{ flex: 1 }}
                      disabled={!!sending}
                      onClick={() => openDateModal("certificate")}
                    >
                      {sending === `${selected.id}:certificate`
                        ? "Generating..."
                        : certDoc ? "↺ Regenerate Certificate" : "Generate Certificate"}
                    </button>
                    {certDoc && (
                      <a
                        href={certDoc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="adm-action-btn"
                        style={{
                          background: "rgba(96,165,250,0.07)",
                          border: "1px solid rgba(96,165,250,0.2)",
                          color: "#60a5fa", textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >↗ View</a>
                    )}
                  </div>
                  {certDoc && (
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#39ff14", paddingLeft: 2 }}>
                      ✓ Certificate generated
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── Date Modal ── */}
      {dateModal && selected && (
        <DocumentDateModal
          type={dateModal}
          applicantName={selected.name || "Applicant"}
          onCancel={() => setDateModal(null)}
          onConfirm={(dates) => handleGenerateDocument(dateModal, dates)}
        />
      )}

      {toast && <div className="adm-toast">{toast}</div>}
    </>
  );
};

export default AdminDashboard;