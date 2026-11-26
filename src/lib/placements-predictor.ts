// src/lib/placements-predictor.ts — Classification algorithms in TypeScript

export interface PredictionResult {
  probability: number; // 0 to 100
  tier: "High" | "Medium" | "Low" | "Critical";
  suggestions: string[];
}

/**
 * Calculates student placement probability based on academic records.
 * Uses a weighted classification scoring system aligned with standard university recruitment parameters.
 */
export function predictPlacementProbability(
  sgpa: number,
  backlogs: number,
  attendance: number,
  skillCount: number
): PredictionResult {
  let score = 0;

  // 1. SGPA (Academic Performance) - Weight: 40%
  // Optimal is 8.5+; severe penalty under 6.0
  if (sgpa >= 9.0) {
    score += 40;
  } else if (sgpa >= 8.0) {
    score += 35;
  } else if (sgpa >= 7.0) {
    score += 25;
  } else if (sgpa >= 6.0) {
    score += 15;
  } else {
    score += 5;
  }

  // 2. Attendance Consistency - Weight: 20%
  // Standard minimum is 75%
  if (attendance >= 90) {
    score += 20;
  } else if (attendance >= 80) {
    score += 17;
  } else if (attendance >= 75) {
    score += 12;
  } else if (attendance >= 65) {
    score += 5;
  } else {
    score += 0;
  }

  // 3. Technical Skills Depth - Weight: 30%
  // 5+ skills is strong; 0-1 is very weak
  if (skillCount >= 6) {
    score += 30;
  } else if (skillCount >= 4) {
    score += 25;
  } else if (skillCount >= 3) {
    score += 18;
  } else if (skillCount >= 2) {
    score += 10;
  } else {
    score += 2;
  }

  // 4. Academic Backlogs - Weight: -10% per backlog (max penalty -35%)
  const backlogPenalty = Math.min(35, backlogs * 12);
  score -= backlogPenalty;

  // Clamp probability between 0 and 100
  const probability = Math.max(0, Math.min(100, Math.round(score)));

  // Determine Placement Tier
  let tier: "High" | "Medium" | "Low" | "Critical" = "Low";
  if (probability >= 75) {
    tier = "High";
  } else if (probability >= 50) {
    tier = "Medium";
  } else if (probability >= 30) {
    tier = "Low";
  } else {
    tier = "Critical";
  }

  // Generate Suggestions
  const suggestions: string[] = [];

  if (sgpa < 7.5) {
    suggestions.push(`Academic CGPA is currently ${sgpa}. Aim to lift this above 7.5 in upcoming semesters to meet core eligibility criteria for premium recruiters like Google, Microsoft, or high-tier consulting firms.`);
  }

  if (backlogs > 0) {
    suggestions.push(`You have ${backlogs} active backlog(s). Most recruiters require zero active backlogs at the time of recruitment. Focus on clearing these papers in the immediate supplementary exams.`);
  }

  if (attendance < 75) {
    suggestions.push(`Attendance is at ${attendance}%, which is below the mandatory university threshold (75%). Rectify this immediately to avoid debarment from placements.`);
  } else if (attendance < 85) {
    suggestions.push(`Attendance is at ${attendance}%. Maintain a buffer above 85% to demonstrate discipline and ensure eligibility under strict company policies.`);
  }

  if (skillCount < 4) {
    suggestions.push(`Skills count is low (${skillCount}). Learn 2 or more in-demand technical frameworks (e.g. React/Next.js, Node.js/Express, Python/Pandas, SQL/PostgreSQL) and build projects to showcase in your resume.`);
  }

  if (probability >= 80) {
    suggestions.push("Excellent profile! Continue mock technical interviews and work on system design concepts to target Tier-1 packages (15+ LPA).");
  } else if (probability >= 60) {
    suggestions.push("Solid foundation. Focus on advanced Data Structures & Algorithms, and brush up on core CS fundamentals (DBMS, OS, Networks) to convert mid-to-high level opportunities.");
  } else {
    suggestions.push("Your placement chances are critical. Prioritize raising your academic score and clearing backlogs immediately while working on core coding languages.");
  }

  return { probability, tier, suggestions };
}
