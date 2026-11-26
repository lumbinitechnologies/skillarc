import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import techAnimation from "../../assets/lottie/tech.json";
import electricAnimation from "../../assets/lottie/electric.json";

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  code:   "M16 18l6-6-6-6M8 6l-6 6 6 6",
  ai:     "M12 2a2 2 0 012 2v2h2a2 2 0 010 4h-2v2a2 2 0 01-4 0v-2H8a2 2 0 010-4h2V4a2 2 0 012-2zM12 18v4M8 18v4",
  cloud:  "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  data:   "M3 3h18v4H3zM3 11h18v4H3zM3 19h18v2H3z",
  zap:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  power:  "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  grid:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

const CARD_NODE_KEYS = ["sw", "ai", "cloud", "cyber", "ux", "data"];

// Floating labels that ride along packets
const SPOKE_LABELS = {
  sw:    "BUILD",
  ai:    "MODEL",
  cloud: "CLOUD",
  cyber: "SECURE",
  ux:    "DESIGN",
  data:  "DATA",
};

const digitalServices = [
  {
    title: "Software Development",
    icon: "code",
    label: "Web · Mobile · Enterprise",
    desc: "Custom applications built to your exact workflow — from business portals to full-scale enterprise platforms.",
    subs: ["Custom Web Applications", "Business Portals", "Enterprise Software", "Mobile Applications"],
    size: "large",
    nodeKey: "sw",
  },
  {
    title: "Artificial Intelligence",
    icon: "ai",
    label: "Intelligent Automation",
    desc: "Agentic AI, predictive analytics, and automation systems that turn data into decisions.",
    subs: ["Agentic AI", "Predictive Analytics", "Computer Vision", "AI Automation", "Chatbots"],
    size: "large",
    accent: true,
    nodeKey: "ai",
  },
  {
    title: "Cloud Engineering",
    icon: "cloud",
    label: "AWS · Azure · GCP",
    desc: "Reliable cloud infrastructure — migration, DevOps pipelines, and ongoing reliability.",
    subs: ["Cloud Migration", "DevOps", "Infrastructure Automation", "Cloud Security"],
    size: "small",
    nodeKey: "cloud",
  },
  {
    title: "Cybersecurity",
    icon: "shield",
    label: "Protect · Detect · Comply",
    desc: "End-to-end security posture — assessments, threat monitoring, and compliance frameworks.",
    subs: ["Security Assessments", "Threat Detection", "Risk Management", "Compliance Support"],
    size: "small",
    nodeKey: "cyber",
  },
  {
    title: "UI/UX Design",
    icon: "grid",
    label: "Design · Prototype · Experience",
    desc: "User-centered interfaces and digital experiences designed to improve engagement and usability.",
    subs: ["UI Design", "UX Research", "Wireframing", "Prototyping"],
    size: "small",
    nodeKey: "ux",
  },
  {
    title: "Data & Analytics",
    icon: "data",
    label: "Pipelines · BI · Real-time",
    desc: "From raw ingestion to live dashboards — infrastructure that turns data into business clarity.",
    subs: ["Data Engineering", "Business Intelligence", "Real-Time Analytics", "Data Warehousing"],
    size: "wide",
    nodeKey: "data",
  },
];

const engineeringServices = [
  { title: "Electrical Infrastructure", icon: "zap",   label: "Commercial & Industrial", subs: ["Commercial Installations", "Industrial Systems", "Infrastructure Projects"] },
  { title: "Power Distribution",        icon: "power", label: "Networks & Transformers",  subs: ["Distribution Networks", "Transformer Installations", "Distribution Support"] },
  { title: "Substation Solutions",      icon: "grid",  label: "Install · Upgrade · Maintain", subs: ["Substation Installation", "Substation Upgrades", "Infrastructure Maintenance"] },
  { title: "Technical Consulting",      icon: "users", label: "Advisory & Planning",      subs: ["Electrical Consulting", "Infrastructure Planning", "Project Advisory"] },
];

const industries = [
  "Banking & Finance","Government","Healthcare","Education",
  "Manufacturing","Retail","Logistics","Technology",
];

const steps = [
  { num: "01", title: "Understand", desc: "We map your goals, constraints, and the outcomes that matter — before proposing anything." },
  { num: "02", title: "Design",     desc: "Architects and engineers shape a solution for your context specifically, not a reused template." },
  { num: "03", title: "Build",      desc: "Disciplined delivery across software, infrastructure, or electrical — clear milestones throughout." },
  { num: "04", title: "Support",    desc: "We stay engaged after launch, monitoring and iterating as your needs evolve." },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };

/* ═══════════════════════════════════════════════════════════
   AI CORE NETWORK CANVAS  — v2 (all 7 fixes applied)

   Fix 1 → coreR base = 40 (2.5x larger)
   Fix 2 → core Y = H * 0.18 (sits between title & cards)
   Fix 3 → baseAlpha = 0.18, AI spoke = 0.30
   Fix 4 → AI card receives dedicated continuous packet stream
   Fix 5 → Floating spoke labels travel with packets
   Fix 6 → Giant soft golden halo behind core
   Fix 7 → Hover triggers 3-4 simultaneous packets / surge
═══════════════════════════════════════════════════════════ */
const AICoreCanvas = ({ hoveredCard, cardRefs, containerRef }) => {
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const hoveredRef = useRef(null);
  const cardNodePositions = useRef({});
  const coreRef = useRef({ x: 0, y: 0, pulse: 0 });

  useEffect(() => { hoveredRef.current = hoveredCard; }, [hoveredCard]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    let raf;

    /* ── resize ── */
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── mouse ── */
    const onMove = e => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    /* ── ambient particles ── */
    const PARTICLE_COUNT = 65;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      r: 1 + Math.random() * 1.6,
      alpha: 0.1 + Math.random() * 0.22,
    }));

    /* ── spoke packets ── */
    // each entry: { t, speed, dir, label }
    const spokes = {};
    CARD_NODE_KEYS.forEach(k => { spokes[k] = []; });

    /* ── scan beam ── */
    let scanX = -200, scanAlpha = 0, scanTimer = 0;

    /* ── build-on ── */
    let buildPct = 0;

    /* ── packet spawners ── */
    let packetTimer = 0;
    let aiDedicatedTimer = 0; // Fix 4: dedicated AI stream

    const spawnPacket = (key, forceLabel = false) => {
      spokes[key].push({
        t: 0,
        speed: 0.013 + Math.random() * 0.009,
        dir: 1,
        showLabel: forceLabel || Math.random() > 0.55,
      });
    };
    const spawnReturnPacket = (key) => {
      spokes[key].push({
        t: 1,
        speed: -(0.009 + Math.random() * 0.007),
        dir: -1,
        showLabel: false,
      });
    };

    /* ── card DOM position ── */
    const getCardPos = (key) => {
      const el = cardRefs.current[key];
      if (!el) return null;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      return {
        x: eRect.left - cRect.left + eRect.width  * 0.5,
        y: eRect.top  - cRect.top  + eRect.height * 0.12,
      };
    };

    /* ── helpers ── */
    const lerp = (a, b, t) => a + (b - a) * t;

    const drawOrb = (x, y, r, innerCol, outerCol, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,   `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.3, `rgba(${innerCol},${alpha * 0.9})`);
      g.addColorStop(0.7, `rgba(${outerCol},${alpha * 0.4})`);
      g.addColorStop(1,   `rgba(${outerCol},0)`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    };

    const drawGlowLine = (x1, y1, x2, y2, alpha, width, color = "250,204,21") => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${color},${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    let t = 0;

    const draw = () => {
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      buildPct = Math.min(1, buildPct + 0.007);
      const eased = buildPct < 1 ? 1 - Math.pow(1 - buildPct, 3) : 1;

      /* ── Fix 2: core Y = 18% ── */
      const core = { x: W * 0.5, y: H * 0.18 };
      coreRef.current.x = core.x;
      coreRef.current.y = core.y;

      /* ── cache card positions ── */
      CARD_NODE_KEYS.forEach(k => {
        const pos = getCardPos(k);
        if (pos) cardNodePositions.current[k] = pos;
      });

      const hovered = hoveredRef.current;
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      /* ═══════════════════
         FIX 6: GIANT GOLDEN HALO behind core
      ═══════════════════ */
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.2);
      const corePulse = Math.min(3, coreRef.current.pulse || 0);

      // Mega halo — the very first thing drawn so everything sits on top
      const haloR = 180 + breathe * 20 + corePulse * 30;
      const haloG = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, haloR);
      haloG.addColorStop(0,   `rgba(250,204,21,${(0.10 + corePulse * 0.06) * eased})`);
      haloG.addColorStop(0.3, `rgba(250,160,0,${(0.06 + corePulse * 0.04) * eased})`);
      haloG.addColorStop(0.7, `rgba(250,120,0,${0.025 * eased})`);
      haloG.addColorStop(1,   `rgba(250,204,21,0)`);
      ctx.beginPath();
      ctx.arc(core.x, core.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = haloG;
      ctx.fill();

      // Secondary mid halo
      const midHaloR = 90 + breathe * 12 + corePulse * 18;
      const midHaloG = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, midHaloR);
      midHaloG.addColorStop(0,   `rgba(255,230,80,${(0.18 + corePulse * 0.1) * eased})`);
      midHaloG.addColorStop(0.5, `rgba(250,180,20,${(0.09 + corePulse * 0.05) * eased})`);
      midHaloG.addColorStop(1,   `rgba(250,204,21,0)`);
      ctx.beginPath();
      ctx.arc(core.x, core.y, midHaloR, 0, Math.PI * 2);
      ctx.fillStyle = midHaloG;
      ctx.fill();

      /* ═══════════════════
         AMBIENT PARTICLES
      ═══════════════════ */
      particles.forEach(p => {
        const px = p.x * W, py = p.y * H;
        if (mx > 0 && my > 0) {
          const dx = mx - px, dy = my - py;
          const dist = Math.hypot(dx, dy);
          if (dist < 200 && dist > 1) {
            const force = ((200 - dist) / 200) * 0.00028;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
        const cdx = core.x - px, cdy = core.y - py;
        const cd = Math.hypot(cdx, cdy);
        if (cd > 50 && cd < 450) {
          p.vx += (cdx / cd) * 0.00004;
          p.vy += (cdy / cd) * 0.00004;
        }
        p.vx *= 0.988; p.vy *= 0.988;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;

        drawOrb(p.x * W, p.y * H, p.r * 2.5, "250,204,21", "250,204,21", p.alpha * eased * 0.65);
      });

      /* ═══════════════════
         SCAN BEAM
      ═══════════════════ */
      scanTimer++;
      if (scanTimer > 200) { scanTimer = 0; scanX = -120; scanAlpha = 0.5; }
      if (scanAlpha > 0) {
        scanX += 4.8;
        scanAlpha = Math.max(0, scanAlpha - 0.0028);
        const sg = ctx.createLinearGradient(scanX - 90, 0, scanX + 90, 0);
        sg.addColorStop(0,    "rgba(250,204,21,0)");
        sg.addColorStop(0.35, "rgba(250,204,21,0.06)");
        sg.addColorStop(0.5,  `rgba(255,255,200,${scanAlpha * 0.11})`);
        sg.addColorStop(0.65, "rgba(250,204,21,0.06)");
        sg.addColorStop(1,    "rgba(250,204,21,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(scanX - 90, 0, 180, H);
        ctx.beginPath();
        ctx.moveTo(scanX, 0); ctx.lineTo(scanX, H);
        ctx.strokeStyle = `rgba(255,255,180,${scanAlpha * 0.22})`;
        ctx.lineWidth = 1; ctx.stroke();
      }

      /* ═══════════════════
         SPOKES
      ═══════════════════ */
      CARD_NODE_KEYS.forEach(key => {
        const nodePos = cardNodePositions.current[key];
        if (!nodePos) return;

        const isHovered = hovered === key;
        const isAI = key === "ai";

        /* Fix 3: stronger base alphas */
        const baseAlpha = isAI ? 0.30 : 0.18;
        const lineAlpha = (isHovered ? 0.85 : baseAlpha) * eased;
        const lineW     = isHovered ? 2.0 : (isAI ? 1.4 : 0.9);

        const tx = lerp(core.x, nodePos.x, isHovered ? 1 : eased);
        const ty = lerp(core.y, nodePos.y, isHovered ? 1 : eased);

        // Glow behind line on hover or AI
        if (isHovered || isAI) {
          drawGlowLine(core.x, core.y, tx, ty, lineAlpha * 0.22, lineW + 8);
        }
        // Core spoke line
        drawGlowLine(core.x, core.y, tx, ty, lineAlpha, lineW);

        // Node anchor dot
        const nodePulse = isHovered ? 1 : (isAI ? 0.7 : 0.35);
        drawOrb(nodePos.x, nodePos.y, isHovered ? 10 : (isAI ? 7 : 5),
          "250,204,21", "250,204,21", nodePulse * eased * 0.9);

        // Hover rings
        if (isHovered) {
          [14, 22, 32].forEach((r, i) => {
            ctx.beginPath();
            ctx.arc(nodePos.x, nodePos.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(250,204,21,${[0.40, 0.15, 0.06][i]})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        }

        /* ── packets ── */
        spokes[key] = spokes[key].filter(pkt => {
          pkt.t += pkt.speed;
          const progress = pkt.dir === 1 ? pkt.t : 1 - pkt.t;
          if (progress < 0 || progress > 1.02) return false;

          const px = lerp(core.x, nodePos.x, progress);
          const py = lerp(core.y, nodePos.y, progress);

          if (pkt.dir === 1 && pkt.t > 0.98) {
            if (!coreRef.current.pulse) coreRef.current.pulse = 0;
            coreRef.current.pulse += 0.7;
            spawnReturnPacket(key);
            return false;
          }
          if (pkt.dir === -1 && progress < 0.02) {
            if (!coreRef.current.pulse) coreRef.current.pulse = 0;
            coreRef.current.pulse += 1.0;
            return false;
          }

          // tail gradient
          const tailProg = Math.max(0, progress - (pkt.dir === 1 ? 0.12 : -0.12));
          const tx2 = lerp(core.x, nodePos.x, tailProg);
          const ty2 = lerp(core.y, nodePos.y, tailProg);
          const tailGrad = ctx.createLinearGradient(tx2, ty2, px, py);
          tailGrad.addColorStop(0, "rgba(250,204,21,0)");
          tailGrad.addColorStop(0.4, "rgba(250,204,21,0.55)");
          tailGrad.addColorStop(1, "rgba(255,255,255,1)");
          ctx.beginPath(); ctx.moveTo(tx2, ty2); ctx.lineTo(px, py);
          ctx.strokeStyle = tailGrad;
          ctx.lineWidth = isHovered ? 2.5 : 1.8;
          ctx.stroke();

          // packet head
          drawOrb(px, py, isHovered ? 7 : 5, "255,255,255", "250,204,21", 0.97);

          /* Fix 5: Floating spoke label riding with packet */
          if (pkt.showLabel && pkt.dir === 1 && progress > 0.1 && progress < 0.88) {
            const label = SPOKE_LABELS[key] || key.toUpperCase();
            // compute angle for offset
            const angle = Math.atan2(nodePos.y - core.y, nodePos.x - core.x);
            const perpX = -Math.sin(angle) * 12;
            const perpY =  Math.cos(angle) * 12;

            ctx.save();
            ctx.font = `600 8px 'Share Tech Mono', monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const labelAlpha = Math.min(1, Math.min(progress / 0.15, (0.88 - progress) / 0.12)) * (isHovered ? 1 : 0.75);
            ctx.fillStyle = `rgba(250,204,21,${labelAlpha * eased})`;
            ctx.fillText(label, px + perpX, py + perpY);
            ctx.restore();
          }

          return true;
        });
      });

      /* ═══════════════════
         FIX 4 & 7: PACKET SPAWNER
         - AI card always gets dedicated stream
         - Hover triggers surge (3-4 simultaneous)
      ═══════════════════ */
      packetTimer++;
      aiDedicatedTimer++;

      const interval = hovered ? 14 : 50; // faster on hover
      if (packetTimer > interval && eased > 0.4) {
        packetTimer = 0;
        if (hovered) {
          /* Fix 7: surge — 3-4 packets simultaneously on hover */
          const burst = 3 + (Math.random() > 0.5 ? 1 : 0);
          for (let i = 0; i < burst; i++) {
            setTimeout(() => spawnPacket(hovered, true), i * 60);
          }
          // Also light up adjacent spokes occasionally
          if (Math.random() > 0.65) {
            const others = CARD_NODE_KEYS.filter(k => k !== hovered);
            spawnPacket(others[Math.floor(Math.random() * others.length)]);
          }
        } else {
          const key = CARD_NODE_KEYS[Math.floor(Math.random() * CARD_NODE_KEYS.length)];
          spawnPacket(key);
        }
      }

      /* Fix 4: Dedicated AI stream — runs regardless of hover */
      if (aiDedicatedTimer > 38 && eased > 0.5) {
        aiDedicatedTimer = 0;
        spawnPacket("ai", true);
        // Occasionally double-packet the AI spoke
        if (Math.random() > 0.6) {
          setTimeout(() => spawnPacket("ai"), 120);
        }
      }

      /* ═══════════════════
         AI CORE ORB (Fix 1: 2.5x larger base)
      ═══════════════════ */
      coreRef.current.pulse = Math.min(3, (coreRef.current.pulse || 0));
      coreRef.current.pulse *= 0.92;
      const cp = coreRef.current.pulse;

      // Fix 1: base radius 40 (was 22)
      const coreR = 40 + breathe * 6 + cp * 8;

      // Outer aura — much bigger now
      drawOrb(core.x, core.y, coreR * 5.5, "250,204,21", "180,120,0",
        (0.05 + breathe * 0.025 + cp * 0.05) * eased);

      // Mid glow
      drawOrb(core.x, core.y, coreR * 2.5, "250,204,21", "200,140,0",
        (0.22 + breathe * 0.08 + cp * 0.14) * eased);

      // Core body
      drawOrb(core.x, core.y, coreR, "255,255,255", "250,204,21",
        (0.78 + breathe * 0.14 + cp * 0.18) * eased);

      // Inner hot-white centre
      drawOrb(core.x, core.y, coreR * 0.35, "255,255,255", "255,240,160",
        (0.95 + cp * 0.05) * eased);

      // Pulse rings on packet arrival
      if (cp > 0.3) {
        [0, 0.33, 0.66].forEach(offset => {
          const ringProg = ((t * 0.85 + offset) % 1);
          const rr = coreR + ringProg * 100;
          const ra = (1 - ringProg) * cp * 0.28;
          if (ra > 0.01) {
            ctx.beginPath();
            ctx.arc(core.x, core.y, rr, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(250,204,21,${ra * eased})`;
            ctx.lineWidth = 1.5; ctx.stroke();
          }
        });
      }

      // Orbiting dashed ring
      ctx.save();
      ctx.translate(core.x, core.y);
      ctx.rotate(t * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, coreR + 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250,204,21,${(0.22 + cp * 0.18) * eased})`;
      ctx.lineWidth = 0.9;
      ctx.setLineDash([5, 7]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Counter-rotating ring
      ctx.rotate(-t * 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, coreR + 24, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250,204,21,${(0.10 + cp * 0.08) * eased})`;
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // "AI CORE" label
      ctx.font = `700 11px 'Orbitron', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(250,204,21,${(0.7 + breathe * 0.2) * eased})`;
      ctx.fillText("AI CORE", core.x, core.y + coreR + 22);
      ctx.font = `500 8px 'Share Tech Mono', monospace`;
      ctx.fillStyle = `rgba(255,255,255,${0.28 * eased})`;
      ctx.fillText("CENTRAL INTELLIGENCE", core.x, core.y + coreR + 36);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [cardRefs, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};

/* ── Electric Arc Canvas ── */
const ElectricCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const bolt = (x1, y1, x2, y2, roughness, depth, alpha) => {
      if (depth === 0 || alpha < 0.04) return;
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * roughness;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * roughness;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(250,204,21,${alpha})`; ctx.lineWidth = depth * 0.7; ctx.stroke();
      if (Math.random() > 0.45) bolt(x1, y1, mx, my, roughness * 0.55, depth - 1, alpha * 0.7);
      if (Math.random() > 0.45) bolt(mx, my, x2, y2, roughness * 0.55, depth - 1, alpha * 0.7);
      if (depth > 1 && Math.random() > 0.65) {
        bolt(mx, my, mx + (Math.random() - 0.5) * roughness * 1.5, my + (Math.random() - 0.5) * roughness * 1.5, roughness * 0.4, depth - 2, alpha * 0.45);
      }
    };
    const getNodes = () => {
      const w = canvas.width, h = canvas.height;
      return [
        { x1: w*0.08, y1: h*0.3,  x2: w*0.22, y2: h*0.55 },
        { x1: w*0.32, y1: h*0.2,  x2: w*0.46, y2: h*0.6  },
        { x1: w*0.55, y1: h*0.35, x2: w*0.7,  y2: h*0.65 },
        { x1: w*0.78, y1: h*0.25, x2: w*0.92, y2: h*0.5  },
      ];
    };
    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.4, sp: Math.random() * 0.3 + 0.05, o: Math.random() * 0.5 + 0.1,
    }));
    let boltTimer = 0, activeBolt = null, boltLife = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.012;
      const w = canvas.width, h = canvas.height;
      particles.forEach(p => {
        p.y -= p.sp * 0.004; if (p.y < 0) p.y = 1;
        const g = ctx.createRadialGradient(p.x*w, p.y*h, 0, p.x*w, p.y*h, p.r*3);
        g.addColorStop(0, `rgba(250,204,21,${p.o})`); g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(p.x*w, p.y*h, p.r*3, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
      });
      for (let i = 0; i < 3; i++) {
        const y = h*(0.25+i*0.25), phase = t+i*1.2;
        ctx.beginPath(); ctx.moveTo(0,y);
        for (let x = 0; x <= w; x += 6) ctx.lineTo(x, y+Math.sin(x*0.025+phase)*4+Math.sin(x*0.08+phase*2.1)*1.5);
        ctx.strokeStyle = `rgba(250,204,21,${0.06+i*0.02})`; ctx.lineWidth = 1; ctx.stroke();
      }
      boltTimer++;
      if (boltTimer > 28 + Math.random()*40) {
        boltTimer = 0;
        const ns = getNodes(); activeBolt = ns[Math.floor(Math.random()*ns.length)]; boltLife = 6 + Math.floor(Math.random()*6);
      }
      if (activeBolt && boltLife > 0) {
        bolt(activeBolt.x1, activeBolt.y1, activeBolt.x2, activeBolt.y2, 38, 4, (boltLife/12)*0.85);
        boltLife--; if (boltLife === 0) activeBolt = null;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.85 }} />;
};

const ElectricIcon = ({ d }) => (
  <div className="sp-eng-icon-wrap" aria-hidden="true">
    <div className="sp-eng-icon-arc" />
    <div className="sp-eng-icon"><Icon d={d} size={26} /></div>
  </div>
);

const SectionIconHeader = ({ animationData, num, text, variant }) => (
  <div className={`sp-icon-header${variant ? ` sp-icon-header--${variant}` : ""}`}>
    <div className="sp-icon-header-lottie" aria-hidden="true">
      <Lottie animationData={animationData} loop autoplay />
    </div>
    <div className="sp-label">
      <span className="sp-label-num">{num}</span>
      <span className="sp-label-text">{text}</span>
      <div className="sp-label-line" />
    </div>
  </div>
);

const css = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@600;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.sp {
  min-height: 100vh;
  background: transparent;
  color: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow-x: hidden;
}

/* ── HERO ── */
.sp-hero {
  padding: clamp(6.5rem,11vw,9.5rem) clamp(1.25rem,5vw,5rem) clamp(3rem,5vw,4.5rem);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  position: relative;
  background: linear-gradient(180deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.5) 100%);
}
.sp-hero::after {
  content:''; position:absolute; inset:0;
  background: radial-gradient(ellipse 80% 60% at 30% 50%,rgba(250,204,21,0.06) 0%,transparent 65%);
  pointer-events:none;
}
.sp-hero-bar {
  position:absolute; left:clamp(0.75rem,2.5vw,2rem);
  top:28%; bottom:28%; width:2px; border-radius:2px;
  background:linear-gradient(180deg,transparent,#facc15 40%,#39ff14 75%,transparent);
  opacity:0.4;
}
.sp-hero-grid {
  position:relative; z-index:1;
  display:flex; align-items:center; justify-content:space-between;
  gap:clamp(2rem,5vw,4rem); flex-wrap:wrap;
}
.sp-hero-content { flex:1 1 320px; min-width:0; }
.sp-hero-eyebrow {
  display:inline-flex; align-items:center; gap:8px;
  font-family:'Share Tech Mono',monospace;
  font-size:clamp(0.68rem,1.1vw,0.85rem);
  letter-spacing:0.2em; text-transform:uppercase;
  color:#facc15; opacity:0.85; margin-bottom:1.4rem;
}
.sp-hero-eyebrow::before { content:''; width:22px; height:1px; background:#facc15; opacity:0.7; }
.sp-hero h1 {
  font-family:'Orbitron',sans-serif;
  font-size:clamp(1.9rem,4.5vw,3.8rem);
  font-weight:900; line-height:1.12; letter-spacing:-0.5px;
  max-width:780px; margin:0 0 1.3rem;
}
.sp-hero h1 em { font-style:normal; color:#facc15; }
.sp-hero-desc {
  font-size:clamp(0.92rem,1.6vw,1.15rem);
  color:rgba(255,255,255,0.58); line-height:1.85;
  max-width:560px; margin:0;
}
.sp-hero-lottie {
  width:clamp(140px,20vw,290px);
  height:clamp(140px,20vw,290px);
  flex-shrink:0;
  filter:drop-shadow(0 0 26px rgba(250,204,21,0.32));
}
.sp-hero-lottie svg,.sp-hero-lottie > div { width:100%!important; height:100%!important; display:block; }

/* ── SECTION SHELL ── */
.sp-sec {
  padding: clamp(2.5rem,5vw,5rem) clamp(1.25rem,5vw,5rem);
  max-width:1480px; margin:0 auto;
}
.sp-band {
  background:rgba(0,0,0,0.35);
  border-top:1px solid rgba(255,255,255,0.06);
  border-bottom:1px solid rgba(255,255,255,0.06);
}
.sp-band-dark {
  background:rgba(0,0,0,0.55);
  border-top:1px solid rgba(255,255,255,0.07);
  border-bottom:1px solid rgba(255,255,255,0.07);
}

/* ── SECTION LABEL ── */
.sp-label { display:flex; align-items:center; gap:12px; margin-bottom:2.4rem; }
.sp-label-num {
  font-family:'Orbitron',sans-serif;
  font-size:0.72rem; color:rgba(250,204,21,0.45); letter-spacing:0.1em; white-space:nowrap;
}
.sp-label-text {
  font-family:'Share Tech Mono',monospace;
  font-size:clamp(0.68rem,1vw,0.82rem);
  letter-spacing:0.22em; text-transform:uppercase;
  color:rgba(255,255,255,0.3); white-space:nowrap;
}
.sp-label-line { flex:1; min-width:24px; height:1px; background:linear-gradient(90deg,rgba(255,255,255,0.08),transparent); }

/* ── SECTION ICON HEADER ── */
.sp-icon-header { display:flex; align-items:center; gap:18px; margin-bottom:0.3rem; }
.sp-icon-header .sp-label { margin-bottom:0; flex:1; min-width:0; }
.sp-icon-header-lottie {
  width:76px; height:76px; flex-shrink:0;
  filter:drop-shadow(0 0 10px rgba(250,204,21,0.28));
}
.sp-icon-header-lottie svg,.sp-icon-header-lottie > div { width:100%!important; height:100%!important; display:block; }
.sp-icon-header--electric .sp-icon-header-lottie { filter:drop-shadow(0 0 14px rgba(57,255,20,0.4)); }

/* ════════════════════════════
   DIGITAL SOLUTIONS
════════════════════════════ */
.sp-digital-outer {
  position:relative; overflow:hidden;
  background:rgba(4,4,12,0.96);
  border-top:1px solid rgba(255,255,255,0.06);
  border-bottom:1px solid rgba(255,255,255,0.06);
}
.sp-digital-inner { position:relative; z-index:2; }

/*
  AI Core spacer — gives the enlarged core (40px base + halo) 
  enough breathing room between the section label and the bento grid.
  Scales with viewport so the orb never clips or crowd the cards.
*/
.sp-core-spacer {
  height: clamp(130px, 18vw, 200px);
  pointer-events: none;
}

/* ════════════════════════════
   BENTO
════════════════════════════ */
.sp-bento {
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:14px;
}
.sp-bento-large { grid-column:span 3; }
.sp-bento-small { grid-column:span 2; }
.sp-bento-wide  { grid-column:span 6; }

.sp-bcard {
  background:rgba(10,10,20,0.82);
  border:1px solid rgba(255,255,255,0.09);
  border-radius:14px;
  padding:clamp(1.25rem,2vw,2rem);
  position:relative; overflow:hidden;
  display:flex; flex-direction:column; gap:12px;
  transition:border-color 0.28s, background 0.28s, transform 0.28s, box-shadow 0.28s;
  backdrop-filter:blur(22px);
  -webkit-backdrop-filter:blur(22px);
  cursor:default;
  /* isolate each card so the canvas z-index plays nice */
  isolation: isolate;
}
.sp-bcard::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);
}
.sp-bcard-corner {
  position:absolute; top:0; left:0;
  width:18px; height:18px;
  border-top:1.5px solid rgba(250,204,21,0);
  border-left:1.5px solid rgba(250,204,21,0);
  border-radius:14px 0 0 0;
  transition:border-color 0.35s; pointer-events:none;
}
.sp-bcard:hover .sp-bcard-corner { border-color:rgba(250,204,21,0.6); }

.sp-bcard:hover {
  border-color:rgba(250,204,21,0.28);
  background:rgba(16,16,28,0.95);
  transform:translateY(-4px);
  box-shadow:0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(250,204,21,0.07) inset, 0 0 40px rgba(250,204,21,0.06);
}
.sp-bcard--accent {
  background:rgba(22,16,2,0.88);
  border-color:rgba(250,204,21,0.2);
}
.sp-bcard--accent:hover {
  background:rgba(30,22,4,0.97);
  border-color:rgba(250,204,21,0.45);
  box-shadow:0 20px 60px rgba(0,0,0,0.55), 0 0 60px rgba(250,204,21,0.12), 0 0 0 1px rgba(250,204,21,0.1) inset;
}
.sp-bcard--h { flex-direction:row; align-items:flex-start; gap:2rem; }
.sp-bcard--h .sp-bcard-left { flex:0 0 auto; min-width:150px; max-width:190px; }
.sp-bcard--h .sp-bcard-right { flex:1; min-width:0; display:flex; gap:1.5rem; flex-wrap:wrap; }

.sp-bcard-icon {
  width:42px; height:42px; border-radius:10px;
  background:rgba(250,204,21,0.1); border:1px solid rgba(250,204,21,0.15);
  display:flex; align-items:center; justify-content:center;
  color:#facc15; flex-shrink:0; margin-bottom:2px;
  transition:background 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.sp-bcard:hover .sp-bcard-icon {
  background:rgba(250,204,21,0.18);
  border-color:rgba(250,204,21,0.38);
  box-shadow:0 0 20px rgba(250,204,21,0.25);
}
.sp-bcard--accent .sp-bcard-icon {
  background:rgba(250,204,21,0.15);
  border-color:rgba(250,204,21,0.25);
}

.sp-bcard-label {
  font-family:'Share Tech Mono',monospace;
  font-size:clamp(0.62rem,0.85vw,0.72rem);
  letter-spacing:0.14em; text-transform:uppercase;
  color:rgba(255,255,255,0.28);
}
.sp-bcard--accent .sp-bcard-label { color:rgba(250,204,21,0.55); }

.sp-bcard h3 {
  font-family:'Orbitron',sans-serif;
  font-size:clamp(0.9rem,1.4vw,1.12rem);
  font-weight:700; color:#fff; margin:0; letter-spacing:0.4px; line-height:1.3;
}
.sp-bcard--accent h3 { color:#facc15; }

.sp-bcard-desc {
  font-size:clamp(0.82rem,1.1vw,0.95rem);
  color:rgba(255,255,255,0.48); line-height:1.7; margin:0; flex:1;
}
.sp-bcard-subs { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:2px; }
.sp-bcard-sub {
  font-size:clamp(0.68rem,0.88vw,0.75rem);
  padding:4px 11px; border-radius:99px;
  background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.45);
  border:1px solid rgba(255,255,255,0.09);
  letter-spacing:0.03em; white-space:nowrap;
  transition:background 0.22s, color 0.22s, border-color 0.22s;
}
.sp-bcard:hover .sp-bcard-sub {
  background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.68);
  border-color:rgba(255,255,255,0.15);
}
.sp-bcard--accent .sp-bcard-sub {
  background:rgba(250,204,21,0.09); color:rgba(250,204,21,0.75);
  border-color:rgba(250,204,21,0.18);
}
.sp-bcard-col { display:flex; flex-direction:column; gap:3px; flex:1; min-width:120px; }
.sp-bcard-col-label {
  font-family:'Share Tech Mono',monospace;
  font-size:clamp(0.6rem,0.82vw,0.7rem);
  letter-spacing:0.16em; text-transform:uppercase;
  color:rgba(255,255,255,0.22); margin-bottom:8px;
}
.sp-bcard-col-item {
  font-size:clamp(0.8rem,1.1vw,0.92rem);
  color:rgba(255,255,255,0.52); line-height:1.65;
  padding-left:12px; position:relative;
}
.sp-bcard-col-item::before { content:'–'; position:absolute; left:0; color:rgba(250,204,21,0.4); }

/* Node connector dot — top-centre of card, lit by canvas */
.sp-bcard-node-dot {
  position:absolute; top:-1px; left:50%; transform:translateX(-50%);
  width:8px; height:8px; border-radius:50%;
  background:#facc15;
  box-shadow:0 0 10px #facc15, 0 0 20px rgba(250,204,21,0.6);
  opacity:0; transition:opacity 0.3s;
  pointer-events:none;
  z-index:3;
}
.sp-bcard:hover .sp-bcard-node-dot { opacity:1; }
.sp-bcard--accent .sp-bcard-node-dot { opacity:0.7; }
.sp-bcard--accent:hover .sp-bcard-node-dot { opacity:1; }

/* ════════════════════════════
   ENGINEERING
════════════════════════════ */
.sp-eng-outer {
  position:relative; overflow:hidden;
  background:rgba(4,6,14,0.92);
  border-top:1px solid rgba(250,204,21,0.12);
  border-bottom:1px solid rgba(250,204,21,0.12);
}
.sp-eng-outer::after {
  content:''; position:absolute; inset:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.08) 3px,rgba(0,0,0,0.08) 4px);
  pointer-events:none; z-index:1;
}
.sp-eng-inner { position:relative; z-index:2; }
.sp-eng-grid {
  display:grid; grid-template-columns:repeat(4,1fr); gap:0;
  max-width:1480px; margin:0 auto;
}
.sp-eng-card {
  padding:clamp(1.75rem,3.5vw,3rem) clamp(1.25rem,2.5vw,2.4rem);
  border-right:1px solid rgba(250,204,21,0.1);
  position:relative; transition:background 0.32s; overflow:hidden;
}
.sp-eng-card:last-child { border-right:none; }
.sp-eng-card:hover { background:rgba(250,204,21,0.035); }
.sp-eng-card::before {
  content:''; position:absolute; left:0; top:18%; bottom:18%; width:2px;
  background:linear-gradient(180deg,transparent,#facc15,#39ff14,transparent);
  opacity:0; border-radius:2px; transition:opacity 0.32s;
}
.sp-eng-card:hover::before { opacity:0.7; }
.sp-eng-card::after {
  content:''; position:absolute; top:0; left:-100%; width:100%; height:1px;
  background:linear-gradient(90deg,transparent,#facc15,#39ff14,transparent);
  transition:left 0.55s ease;
}
.sp-eng-card:hover::after { left:100%; }
.sp-eng-icon-wrap { position:relative; width:54px; height:54px; margin-bottom:1.4rem; }
.sp-eng-icon-arc {
  position:absolute; inset:0; border-radius:50%;
  border:1.5px solid rgba(250,204,21,0.3);
  animation:sp-arc-spin 4s linear infinite;
  background:conic-gradient(from 0deg,rgba(250,204,21,0.5),rgba(57,255,20,0.3),transparent 60%);
  -webkit-mask:radial-gradient(circle,transparent 45%,black 46%);
  mask:radial-gradient(circle,transparent 45%,black 46%);
}
@keyframes sp-arc-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.sp-eng-card:hover .sp-eng-icon-arc {
  animation-duration:0.9s;
  border-color:rgba(250,204,21,0.8);
  box-shadow:0 0 12px rgba(250,204,21,0.4),0 0 28px rgba(57,255,20,0.2);
}
.sp-eng-icon {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  color:#facc15; transition:color 0.25s,filter 0.25s;
}
.sp-eng-card:hover .sp-eng-icon { color:#fff; filter:drop-shadow(0 0 6px rgba(250,204,21,0.8)); }
.sp-eng-badge {
  display:inline-flex; align-items:center; gap:5px;
  font-family:'Share Tech Mono',monospace;
  font-size:clamp(0.6rem,0.85vw,0.72rem);
  letter-spacing:0.14em; text-transform:uppercase;
  color:rgba(57,255,20,0.6); margin-bottom:0.9rem;
  animation:sp-badge-flicker 3.5s ease-in-out infinite;
}
@keyframes sp-badge-flicker {
  0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.3} 94%{opacity:1} 97%{opacity:0.5} 98%{opacity:1}
}
.sp-eng-badge::before {
  content:''; width:6px; height:6px; border-radius:50%;
  background:#39ff14; box-shadow:0 0 6px #39ff14;
  animation:sp-dot-pulse 1.8s ease-in-out infinite; flex-shrink:0;
}
@keyframes sp-dot-pulse {
  0%,100%{opacity:1;box-shadow:0 0 6px #39ff14} 50%{opacity:0.4;box-shadow:0 0 2px #39ff14}
}
.sp-eng-card h3 {
  font-family:'Orbitron',sans-serif;
  font-size:clamp(0.9rem,1.4vw,1.1rem);
  font-weight:700; color:#fff; margin:0 0 0.4rem; letter-spacing:0.5px; line-height:1.3;
  transition:color 0.25s;
}
.sp-eng-card:hover h3 { color:#facc15; }
.sp-eng-sublabel {
  font-family:'Share Tech Mono',monospace;
  font-size:clamp(0.62rem,0.88vw,0.72rem);
  letter-spacing:0.14em; text-transform:uppercase;
  color:rgba(255,255,255,0.25); margin-bottom:1.2rem; display:block;
}
.sp-eng-subs { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
.sp-eng-subs li {
  font-size:clamp(0.8rem,1.05vw,0.92rem); color:rgba(255,255,255,0.45);
  line-height:1.55; padding-left:16px; position:relative; transition:color 0.22s;
}
.sp-eng-subs li::before { content:'·'; position:absolute; left:0; color:rgba(57,255,20,0.55); font-size:1.2rem; line-height:1.2; }
.sp-eng-card:hover .sp-eng-subs li { color:rgba(255,255,255,0.62); }

/* ════════════════════════════
   INDUSTRIES
════════════════════════════ */
.sp-pill-cloud { display:flex; flex-wrap:wrap; gap:10px; }
.sp-pill {
  font-size:clamp(0.8rem,1.05vw,0.92rem); font-weight:500;
  padding:9px 20px; border-radius:99px;
  border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04);
  color:rgba(255,255,255,0.58); display:flex; align-items:center; gap:9px;
  transition:border-color 0.22s,background 0.22s,color 0.22s; cursor:default;
}
.sp-pill:hover { border-color:rgba(250,204,21,0.38); background:rgba(250,204,21,0.07); color:rgba(255,255,255,0.9); }
.sp-pill-dot { width:5px; height:5px; border-radius:50%; background:#facc15; opacity:0.55; flex-shrink:0; }

/* ════════════════════════════
   PROCESS
════════════════════════════ */
.sp-process-grid {
  display:grid; grid-template-columns:repeat(4,1fr);
  position:relative; max-width:1480px; margin:0 auto;
}
.sp-process-grid::before {
  content:''; position:absolute;
  top:clamp(2.2rem,4vw,3.2rem); left:12.5%; right:12.5%; height:1px;
  background:linear-gradient(90deg,rgba(250,204,21,0.25),rgba(57,255,20,0.25),rgba(250,204,21,0.25));
  z-index:0;
}
.sp-process-step {
  padding:clamp(1.75rem,3.5vw,3rem) clamp(1rem,2vw,2rem);
  position:relative; z-index:1; text-align:center;
}
.sp-process-num-wrap { display:flex; justify-content:center; margin-bottom:1.2rem; }
.sp-process-num {
  width:clamp(44px,5vw,58px); height:clamp(44px,5vw,58px); border-radius:50%;
  background:rgba(8,8,14,0.95); border:1px solid rgba(250,204,21,0.28);
  display:flex; align-items:center; justify-content:center;
  font-family:'Orbitron',sans-serif;
  font-size:clamp(0.68rem,1vw,0.86rem); font-weight:700;
  color:#facc15; letter-spacing:1px; box-shadow:0 0 18px rgba(250,204,21,0.08);
}
.sp-process-step h4 {
  font-family:'Orbitron',sans-serif;
  font-size:clamp(0.85rem,1.3vw,1rem); font-weight:700; color:#fff;
  letter-spacing:0.4px; margin:0 0 0.65rem;
}
.sp-process-step p {
  font-size:clamp(0.8rem,1.1vw,0.9rem); color:rgba(255,255,255,0.42); line-height:1.78; margin:0;
}

/* ════════════════════════════
   CTA
════════════════════════════ */
.sp-cta-outer {
  background:rgba(0,0,0,0.5); border-top:1px solid rgba(255,255,255,0.07); position:relative;
}
.sp-cta-outer::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 70% 80% at 50% 100%,rgba(250,204,21,0.06) 0%,transparent 70%);
  pointer-events:none;
}
.sp-cta-sec {
  max-width:1480px; margin:0 auto;
  padding:clamp(3rem,6vw,6rem) clamp(1.25rem,5vw,5rem);
  display:flex; align-items:center; justify-content:space-between;
  gap:2rem; flex-wrap:wrap; position:relative;
}
.sp-cta-text h2 {
  font-family:'Orbitron',sans-serif;
  font-size:clamp(1.25rem,2.8vw,2.1rem); font-weight:700; margin:0 0 0.65rem; letter-spacing:1px;
}
.sp-cta-text p {
  font-size:clamp(0.88rem,1.3vw,1rem); color:rgba(255,255,255,0.45);
  margin:0; line-height:1.78; max-width:480px;
}
.sp-cta-btn {
  background:#facc15; color:#000; border:none; border-radius:8px;
  padding:14px 36px;
  font-family:'Orbitron',sans-serif; font-size:clamp(0.76rem,1vw,0.88rem);
  font-weight:700; letter-spacing:2px; text-transform:uppercase; cursor:pointer; flex-shrink:0;
  transition:transform 0.2s,box-shadow 0.2s,background 0.2s; white-space:nowrap;
}
.sp-cta-btn:hover { background:#fde047; transform:translateY(-2px); box-shadow:0 8px 28px rgba(250,204,21,0.35); }
.sp-cta-btn:active { transform:translateY(0); }
.sp-cta-btn:focus-visible { outline:2px solid #facc15; outline-offset:3px; }

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */
@media(max-width:1100px){
  .sp-bento { grid-template-columns:repeat(6,1fr); }
  .sp-bento-large { grid-column:span 3; }
  .sp-bento-small { grid-column:span 3; }
  .sp-bento-wide  { grid-column:span 6; }
  .sp-eng-grid { grid-template-columns:repeat(2,1fr); }
  .sp-eng-card { border-bottom:1px solid rgba(250,204,21,0.08); }
  .sp-eng-card:nth-child(2n) { border-right:none; }
  .sp-process-grid { grid-template-columns:repeat(2,1fr); }
  .sp-process-grid::before { display:none; }
  .sp-icon-header-lottie { width:62px; height:62px; }
  .sp-core-spacer { height: clamp(115px, 16vw, 175px); }
}
@media(max-width:768px){
  .sp-hero-bar { display:none; }
  .sp-hero-grid { flex-direction:column; align-items:flex-start; gap:2rem; }
  .sp-hero-lottie { width:clamp(120px,36vw,180px); height:clamp(120px,36vw,180px); align-self:center; }
  .sp-bento { grid-template-columns:1fr 1fr; gap:10px; }
  .sp-bento-large { grid-column:span 2; }
  .sp-bento-small { grid-column:span 1; }
  .sp-bento-wide  { grid-column:span 2; }
  .sp-bcard--h { flex-direction:column; }
  .sp-bcard--h .sp-bcard-left { max-width:100%; }
  .sp-bcard--h .sp-bcard-right { flex-direction:column; gap:1rem; }
  .sp-eng-grid { grid-template-columns:1fr 1fr; }
  .sp-process-grid { grid-template-columns:1fr 1fr; }
  .sp-cta-sec { flex-direction:column; align-items:flex-start; }
  .sp-cta-btn { width:100%; text-align:center; }
  .sp-icon-header { gap:12px; }
  .sp-icon-header-lottie { width:50px; height:50px; }
  .sp-core-spacer { height: 105px; }
}
@media(max-width:480px){
  .sp-bento { grid-template-columns:1fr; gap:9px; }
  .sp-bento-large,.sp-bento-small,.sp-bento-wide { grid-column:span 1; }
  .sp-eng-grid { grid-template-columns:1fr; }
  .sp-eng-card { border-right:none; }
  .sp-eng-card:last-child { border-bottom:none; }
  .sp-process-grid { grid-template-columns:1fr; }
  .sp-process-grid::before { display:none; }
  .sp-icon-header-lottie { width:42px; height:42px; }
  .sp-label-text { font-size:0.64rem; letter-spacing:0.16em; }
  .sp-hero-lottie { width:clamp(100px,44vw,150px); height:clamp(100px,44vw,150px); }
  .sp-pill { padding:8px 15px; font-size:0.78rem; }
  .sp-core-spacer { height: 88px; }
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after { animation-duration:0.01ms!important; transition-duration:0.01ms!important; }
}
`;

const ServicePage = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const cardRefs    = useRef({});
  const containerRef = useRef(null);

  useEffect(() => {
    const id = "lumbini-sp-v10";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = css;
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);

  const bentoClass = (size) =>
    size === "large" ? "sp-bento-large" : size === "wide" ? "sp-bento-wide" : "sp-bento-small";

  const setCardRef = useCallback((key, el) => {
    cardRefs.current[key] = el;
  }, []);

  return (
    <motion.div className="sp" initial="hidden" animate="visible" variants={stagger}
      exit={{ opacity: 0, y: -16 }}>

      {/* ── HERO ── */}
      <motion.div className="sp-hero" variants={fadeUp} transition={{ duration: 0.65 }}>
        <div className="sp-hero-bar" />
        <div className="sp-hero-grid">
          <div className="sp-hero-content">
            <div className="sp-hero-eyebrow">What We Deliver</div>
            <h1>Engineering & Technology<br /><em>Built for Real Problems</em></h1>
            <p className="sp-hero-desc">
              From custom software and AI systems to electrical infrastructure and cloud platforms —
              solutions designed around how your business actually works.
            </p>
          </div>
          <div className="sp-hero-lottie" aria-hidden="true">
            <Lottie animationData={techAnimation} loop autoplay />
          </div>
        </div>
      </motion.div>

      {/* ── DIGITAL SOLUTIONS ── */}
      <div className="sp-digital-outer" ref={containerRef}>
        <AICoreCanvas
          hoveredCard={hoveredCard}
          cardRefs={cardRefs}
          containerRef={containerRef}
        />

        <div className="sp-digital-inner">
          <motion.div className="sp-sec"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={stagger}>

            {/* spacer — enlarged for bigger core orb */}
            <div className="sp-core-spacer" />

            <div className="sp-label">
              <span className="sp-label-num">01</span>
              <span className="sp-label-text">Digital Solutions</span>
              <div className="sp-label-line" />
            </div>

            <div className="sp-bento">
              {digitalServices.map((s, i) => {
                const isWide = s.size === "wide";
                return (
                  <motion.div
                    key={i}
                    ref={el => setCardRef(s.nodeKey, el)}
                    className={`sp-bcard ${bentoClass(s.size)} ${s.accent ? "sp-bcard--accent" : ""} ${isWide ? "sp-bcard--h" : ""}`}
                    variants={fadeUp} transition={{ duration: 0.45 }}
                    onMouseEnter={() => setHoveredCard(s.nodeKey)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="sp-bcard-corner" />
                    <div className="sp-bcard-node-dot" />

                    {isWide ? (
                      <>
                        <div className="sp-bcard-left">
                          <div className="sp-bcard-icon" style={{ marginBottom: "0.9rem" }}>
                            <Icon d={ICONS[s.icon]} size={21} />
                          </div>
                          <h3 style={{
                            fontFamily:"'Orbitron',sans-serif",
                            fontSize:"clamp(0.9rem,1.3vw,1.1rem)",
                            fontWeight:700, color:"#fff",
                            margin:"0 0 0.35rem", letterSpacing:"0.4px"
                          }}>{s.title}</h3>
                          <span className="sp-bcard-label">{s.label}</span>
                        </div>
                        <div className="sp-bcard-right">
                          {[s.subs.slice(0, 2), s.subs.slice(2)].map((col, ci) => (
                            <div className="sp-bcard-col" key={ci}>
                              <span className="sp-bcard-col-label">{ci === 0 ? "Pipelines" : "Outputs"}</span>
                              {col.map((item, ji) => <span className="sp-bcard-col-item" key={ji}>{item}</span>)}
                            </div>
                          ))}
                          <div className="sp-bcard-col" style={{ flex:"2", minWidth:"150px" }}>
                            <span className="sp-bcard-col-label">About</span>
                            <p style={{
                              fontSize:"clamp(0.82rem,1.1vw,0.95rem)",
                              color:"rgba(255,255,255,0.46)",
                              lineHeight:"1.7", margin:0
                            }}>{s.desc}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sp-bcard-icon"><Icon d={ICONS[s.icon]} size={21} /></div>
                        <span className="sp-bcard-label">{s.label}</span>
                        <h3>{s.title}</h3>
                        <p className="sp-bcard-desc">{s.desc}</p>
                        <div className="sp-bcard-subs">
                          {s.subs.map((sub, j) => <span key={j} className="sp-bcard-sub">{sub}</span>)}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── ENGINEERING SOLUTIONS ── */}
      <div className="sp-eng-outer">
        <ElectricCanvas />
        <div className="sp-eng-inner">
          <motion.div className="sp-sec" style={{ paddingBottom:"0.5rem" }}
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={stagger}>
            <SectionIconHeader animationData={electricAnimation} num="02" text="Engineering Solutions" variant="electric" />
          </motion.div>
          <motion.div className="sp-eng-grid"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {engineeringServices.map((s, i) => (
              <motion.div key={i} className="sp-eng-card" variants={fadeUp} transition={{ duration: 0.4 }}>
                <ElectricIcon d={ICONS[s.icon]} />
                <div className="sp-eng-badge">Live system</div>
                <h3>{s.title}</h3>
                <span className="sp-eng-sublabel">{s.label}</span>
                <ul className="sp-eng-subs">
                  {s.subs.map((sub, j) => <li key={j}>{sub}</li>)}
                </ul>
              </motion.div>
            ))}
          </motion.div>
          <div style={{ height:"2.5rem" }} />
        </div>
      </div>

      {/* ── INDUSTRIES ── */}
      <div className="sp-band">
        <motion.div className="sp-sec"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
          <div className="sp-label">
            <span className="sp-label-num">03</span>
            <span className="sp-label-text">Industries We Serve</span>
            <div className="sp-label-line" />
          </div>
          <div className="sp-pill-cloud">
            {industries.map((name, i) => (
              <motion.span key={i} className="sp-pill" variants={fadeUp} transition={{ duration: 0.3 }}>
                <span className="sp-pill-dot" />{name}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── HOW WE WORK ── */}
      <div className="sp-band-dark">
        <motion.div className="sp-sec" style={{ paddingBottom:"0.5rem" }}
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={stagger}>
          <div className="sp-label">
            <span className="sp-label-num">04</span>
            <span className="sp-label-text">How We Work</span>
            <div className="sp-label-line" />
          </div>
        </motion.div>
        <motion.div className="sp-process-grid"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
          {steps.map((step, i) => (
            <motion.div key={i} className="sp-process-step" variants={fadeUp} transition={{ duration: 0.4 }}>
              <div className="sp-process-num-wrap">
                <div className="sp-process-num">{step.num}</div>
              </div>
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        <div style={{ height:"2.5rem" }} />
      </div>

      {/* ── CTA ── */}
      <div className="sp-cta-outer">
        <motion.div className="sp-cta-sec"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp} transition={{ duration: 0.6 }}>
          <div className="sp-cta-text">
            <h2>Ready to Build Something That Works?</h2>
            <p>Tell us your challenge. We'll respond with an honest assessment and a clear path forward.</p>
          </div>
          <button className="sp-cta-btn" onClick={() => navigate("/contact")}>Contact Us</button>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default ServicePage;