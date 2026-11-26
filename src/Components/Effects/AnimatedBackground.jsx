import { useEffect, useRef } from "react";

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    const isMobile = window.innerWidth <= 768;
    const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);

    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");

    let mx = canvas.width / 2;
    let my = canvas.height / 2;
    const onMove = (e) => { mx = e.clientX * DPR; my = e.clientY * DPR; };
    const onTouch = (e) => { mx = e.touches[0].clientX * DPR; my = e.touches[0].clientY * DPR; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });

    /* ── STARS ── */
    const STAR_COUNT = isMobile ? 80 : 220;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.03,
      brightness: 0.35 + Math.random() * 0.65,
    }));

    /* ── SHOOTING STARS ── */
    const newShoot = () => {
      const W = canvas.width, H = canvas.height;
      const fromLeft = Math.random() > 0.5;
      const depth = Math.random() < 0.4
        ? 0.7 + Math.random() * 0.3
        : Math.sqrt(Math.random()) * 0.6;
      const speed = (6 + depth * 14) + Math.random() * 3;
      const angle = (15 + Math.random() * 20) * (Math.PI / 180);
      const vx = fromLeft ? speed * Math.cos(angle) : -speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);
      const warm = Math.random() < 0.25;
      return {
        x: fromLeft ? -40 : W + 40,
        y: Math.random() * H,
        vx,
        vy,
        len: 75 + depth * 110,
        age: 0,
        depth,
        thickness: 0.8 + depth * 1.1,
        warm,
        sparkles: [],
        sparkleTimer: 0,
      };
    };
    const SHOOT_COUNT = 1;
    const shoots = Array.from({ length: SHOOT_COUNT }, () => ({ ...newShoot(), age: Math.random() * 100 }));
    const FADE_FRAMES = 20;

    /* ── PARTICLES ── */
    const ORBS = isMobile ? 10 : 25;
    const orbs = Array.from({ length: ORBS }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.5,
      hue: Math.random() < 0.55 ? 44 + Math.random() * 18 : 185 + Math.random() * 35,
      phase: Math.random() * Math.PI * 2,
      trail: [],
    }));

    /* Offscreen trail canvas */
    const trail = document.createElement("canvas");
    trail.width = canvas.width;
    trail.height = canvas.height;
    const tctx = trail.getContext("2d");

    window.addEventListener("resize", () => {
      trail.width = canvas.width;
      trail.height = canvas.height;
    });

    let auroraT = 0;

    /* ── Aurora: skip on mobile entirely (big perf win) ── */
    const AURORA_BANDS = isMobile ? 0 : 3;

    /* ── Connection distance: shorter on mobile = fewer line draws ── */
    const CONN = isMobile ? 80 : 115;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      auroraT += 0.0032;

      ctx.clearRect(0, 0, W, H);

      tctx.globalCompositeOperation = "destination-out";
      tctx.fillStyle = "rgba(0,0,0,0.18)";
      tctx.fillRect(0, 0, W, H);
      tctx.globalCompositeOperation = "source-over";

      /* ── Aurora bands (desktop only) ── */
      for (let band = 0; band < AURORA_BANDS; band++) {
        const hue = 155 + band * 45;
        const yBase = H * (0.08 + band * 0.055);
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= W; x += 12) {
          const y =
            yBase +
            Math.sin(x * 0.003 + auroraT + band) * H * 0.038 +
            Math.sin(x * 0.007 - auroraT * 0.55 + band * 2) * H * 0.018;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, 0, yBase + H * 0.06);
        g.addColorStop(0, `hsla(${hue},75%,52%,0)`);
        g.addColorStop(0.5, `hsla(${hue},85%,58%,${0.018 + band * 0.004})`);
        g.addColorStop(1, `hsla(${hue},75%,52%,0)`);
        ctx.fillStyle = g;
        ctx.fill();
      }

      /* ── Stars ── */
      stars.forEach((s) => {
        s.twinkle += s.speed;
        const alpha = s.brightness * (0.5 + 0.5 * Math.sin(s.twinkle));
        const gw = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
        gw.addColorStop(0, `rgba(220,230,255,${alpha})`);
        gw.addColorStop(1, "rgba(220,230,255,0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = gw;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });

      /* ── Orbital particles ── */
      orbs.forEach((p, i) => {
        p.phase += 0.013;
        const pullX = mx - p.x, pullY = my - p.y;
        const dist = Math.sqrt(pullX * pullX + pullY * pullY);
        if (dist < 220 && dist > 1) {
          p.vx += (pullX / dist) * 0.013;
          p.vy += (pullY / dist) * 0.013;
        }
        p.vx += Math.sin(p.phase) * 0.007;
        p.vy += Math.cos(p.phase * 0.73) * 0.007;
        p.vx *= 0.972;
        p.vy *= 0.972;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 16) p.trail.shift();
        if (p.trail.length > 2) {
          tctx.beginPath();
          tctx.moveTo(p.trail[0].x, p.trail[0].y);
          p.trail.forEach((pt) => tctx.lineTo(pt.x, pt.y));
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          tctx.strokeStyle = `hsla(${p.hue},100%,68%,${Math.min(spd * 0.12, 0.10)})`;
          tctx.lineWidth = 1.2;
          tctx.stroke();
        }

        for (let j = i + 1; j < orbs.length; j++) {
          const q = orbs[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONN) {
            const a = (1 - d / CONN) * 0.15;
            ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2},90%,65%,${a})`;
            ctx.lineWidth = (1 - d / CONN) * 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        const gw = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5.5);
        gw.addColorStop(0, `hsla(${p.hue},100%,92%,0.55)`);
        gw.addColorStop(0.3, `hsla(${p.hue},100%,65%,0.18)`);
        gw.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5.5, 0, Math.PI * 2);
        ctx.fillStyle = gw;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue},100%,96%)`;
        ctx.fill();
      });

      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(trail, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      /* ── Shooting stars ── */
      shoots.forEach((s, i) => {
        s.x += s.vx;
        s.y += s.vy;
        s.age += 1;
        if (s.x < -300 || s.x > W + 300 || s.y > H + 300) {
          shoots[i] = newShoot();
          return;
        }
        const framesToExitX = s.vx > 0 ? (W + 300 - s.x) / s.vx : (s.x + 300) / -s.vx;
        const framesToExitY = (H + 300 - s.y) / s.vy;
        const framesToExit = Math.min(framesToExitX, framesToExitY);
        const fadeIn = Math.min(s.age / FADE_FRAMES, 1);
        const fadeOut = Math.min(framesToExit / FADE_FRAMES, 1);
        const alpha = Math.min(fadeIn, fadeOut);
        if (alpha <= 0) return;

        const ang = Math.atan2(s.vy, s.vx);
        const tx = s.x - Math.cos(ang) * s.len;
        const ty = s.y - Math.sin(ang) * s.len;
        const peakAlpha = 0.35 + s.depth * 0.55;
        const a = alpha * peakAlpha;

        const midColor = s.warm ? `rgba(255,214,150,${a * 0.5})` : `rgba(180,220,255,${a * 0.5})`;
        const sparkleColor = s.warm ? "255,224,170" : "200,230,255";

        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.6, midColor);
        g.addColorStop(1, `rgba(255,255,255,${a})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = (0.6 + alpha * 1) * s.thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        const headR = (4 + s.depth * 6) * (0.6 + 0.4 * alpha);
        const gw = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, headR);
        gw.addColorStop(0, `rgba(255,255,255,${a})`);
        gw.addColorStop(0.4, `rgba(${sparkleColor},${a * 0.5})`);
        gw.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, headR, 0, Math.PI * 2);
        ctx.fillStyle = gw;
        ctx.fill();

        /* sparkles — skip on mobile for perf */
        if (!isMobile) {
          s.sparkleTimer += 1;
          const spawnRate = Math.max(2, Math.round(5 - s.depth * 3));
          if (alpha > 0.3 && s.sparkleTimer >= spawnRate) {
            s.sparkleTimer = 0;
            const perp = ang + Math.PI / 2;
            const jitter = (Math.random() - 0.5) * (2 + s.depth * 3);
            s.sparkles.push({
              x: tx + Math.cos(perp) * jitter,
              y: ty + Math.sin(perp) * jitter,
              r: (0.6 + Math.random() * 1) * (0.5 + s.depth * 0.8),
              life: 1,
            });
          }
          if (s.sparkles.length > 24) s.sparkles.splice(0, s.sparkles.length - 24);

          for (let k = s.sparkles.length - 1; k >= 0; k--) {
            const sp = s.sparkles[k];
            sp.life -= 0.035;
            if (sp.life <= 0) { s.sparkles.splice(k, 1); continue; }
            const sa = sp.life * a;
            const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 2.5);
            sg.addColorStop(0, `rgba(255,255,255,${sa})`);
            sg.addColorStop(1, "rgba(255,255,255,0)");
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.r * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = sg;
            ctx.fill();
          }
        }
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};

export default AnimatedBackground;