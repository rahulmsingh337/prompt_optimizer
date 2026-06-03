import { useEffect, useRef } from "react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.title = "NEXA Prompt Optimizer – Turn Rough Ideas into Perfect AI Prompts";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let mouse = { x: -9999, y: -9999 };
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

    // Create particles
    const COUNT = 120;
    const particles = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 4,           // depth layer 0-4
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.02,
      hue: Math.random() < 0.6 ? 250 : 165,   // purple or teal
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.008;
      ctx.fillStyle = "rgba(15,15,15,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120 + a.z * 20;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.25 * ((a.z + b.z) / 8 + 0.3);
            const hue = (a.hue + b.hue) / 2;
            ctx.strokeStyle = `hsla(${hue},70%,65%,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        // Mouse repulsion / attraction for 4D feel
        const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 180) {
          const force = (180 - mdist) / 180 * 0.4;
          p.vx += (mdx / mdist) * force;
          p.vy += (mdy / mdist) * force;
        }

        // 4D depth oscillation — z shifts over time
        p.z += p.vz + Math.sin(time + p.phase) * 0.015;
        if (p.z < 0) p.z = 0;
        if (p.z > 4) p.z = 4;

        p.x += p.vx * (0.4 + p.z * 0.2);
        p.y += p.vy * (0.4 + p.z * 0.2);
        // friction
        p.vx *= 0.97; p.vy *= 0.97;

        // Wrap edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const size = 1 + p.z * 0.7;
        const brightness = 45 + p.z * 10 + Math.sin(time * 1.5 + p.phase) * 8;
        const alpha = 0.4 + p.z * 0.12 + Math.sin(time + p.phase) * 0.1;

        // Glowing core
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3.5);
        grd.addColorStop(0, `hsla(${p.hue},75%,${brightness}%,${alpha})`);
        grd.addColorStop(1, `hsla(${p.hue},75%,${brightness}%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,${brightness + 15}%,${alpha + 0.3})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const BASE = window.location.origin;

  return (
    <div style={{ background: "#0f0f0f", color: "#e2e8f0", fontFamily: "system-ui,-apple-system,sans-serif", lineHeight: 1.6, overflowX: "hidden", minHeight: "100vh" }}>

      {/* Particle constellation background */}
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

      {/* All content above canvas */}
      <div style={{ position: "relative", zIndex: 1 }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 99, background: "rgba(13,13,26,.95)", borderBottom: "1px solid #1e1e3a", backdropFilter: "blur(12px)", padding: ".9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#EEEDFE", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5DCAA5", display: "inline-block" }}></span>
          NEXA
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <a href="#how-it-works" style={{ fontSize: ".85rem", color: "#94a3b8", textDecoration: "none" }}>How it works</a>
          <a href="#features" style={{ fontSize: ".85rem", color: "#94a3b8", textDecoration: "none" }}>Features</a>
          <a href={`${BASE}/blog`} style={{ fontSize: ".85rem", color: "#94a3b8", textDecoration: "none" }}>Blog</a>
        </div>
        <button onClick={onGetStarted} style={{ background: "#534AB7", color: "#fff", padding: ".45rem 1.1rem", borderRadius: 8, fontSize: ".85rem", fontWeight: 700, border: "none", cursor: "pointer" }}>
          Try Free →
        </button>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "5rem 1.5rem 3rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", background: "#1a1a2e", border: "1px solid #1e1e3a", borderRadius: 100, padding: ".35rem .9rem", fontSize: ".75rem", color: "#5DCAA5", fontWeight: 600, marginBottom: "1.5rem", letterSpacing: ".5px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5DCAA5", animation: "pulse 2s infinite" }}></span>
          FREE · NO CREDIT CARD · NO SIGNUP REQUIRED
        </div>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 900, lineHeight: 1.15, color: "#EEEDFE", letterSpacing: -1, marginBottom: "1.25rem" }}>
          Turn Rough Ideas into<br />
          <span style={{ background: "linear-gradient(135deg,#7F77DD,#5DCAA5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Perfect AI Prompts
          </span>
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#94a3b8", maxWidth: 580, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
          NEXA analyzes your vague request and restructures it into a production-ready prompt using the 4-D pipeline: Deconstruct, Diagnose, Develop, Deliver.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onGetStarted} style={{ background: "linear-gradient(135deg,#534AB7,#1D9E75)", color: "#fff", padding: ".75rem 2rem", borderRadius: 10, fontWeight: 700, fontSize: ".95rem", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: ".5rem" }}>
            Optimize My Prompt →
          </button>
          <a href="#how-it-works" style={{ background: "transparent", color: "#e2e8f0", padding: ".75rem 2rem", borderRadius: 10, fontWeight: 600, fontSize: ".95rem", border: "1px solid #1e1e3a", display: "inline-flex", alignItems: "center", gap: ".5rem", textDecoration: "none" }}>
            See how it works
          </a>
        </div>
        <p style={{ marginTop: "2rem", fontSize: ".78rem", color: "#475569" }}>
          Works with <span style={{ color: "#5DCAA5" }}>ChatGPT</span> · <span style={{ color: "#5DCAA5" }}>Claude</span> · <span style={{ color: "#5DCAA5" }}>Gemini</span> and every major AI model
        </p>
      </section>

      {/* BEFORE / AFTER */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        <p style={{ textAlign: "center", fontSize: ".75rem", fontWeight: 700, letterSpacing: 2, color: "#475569", textTransform: "uppercase", marginBottom: "2rem" }}>See the difference</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "start" }}>
          <div style={{ background: "#0d0d1a", border: "1px solid #1e1e3a", borderRadius: 14, padding: "1.25rem", fontSize: ".82rem", lineHeight: 1.7, fontFamily: "monospace", color: "#94a3b8" }}>
            <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: ".75rem", color: "#ef4444" }}>✗ Before NEXA</div>
            "write me a marketing email for my product"
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: ".5rem", color: "#7F77DD", fontSize: "1.5rem", marginTop: "2rem" }}>→</div>
          <div style={{ background: "rgba(83,74,183,.06)", border: "1px solid #534AB7", borderRadius: 14, padding: "1.25rem", fontSize: ".82rem", lineHeight: 1.7, fontFamily: "monospace", color: "#94a3b8" }}>
            <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: ".75rem", color: "#5DCAA5" }}>✓ After NEXA</div>
            "You are a senior B2B copywriter. Write a persuasive cold email (max 180 words) for [Product] targeting [Audience]. Structure: (1) subject line using their pain point, (2) hook with specific problem, (3) quantified benefit, (4) social proof, (5) single CTA. Tone: professional but conversational."
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <p style={{ textAlign: "center", fontSize: ".72rem", fontWeight: 700, letterSpacing: 3, color: "#5DCAA5", textTransform: "uppercase", marginBottom: ".75rem" }}>The 4-D Pipeline</p>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#EEEDFE", marginBottom: ".75rem", letterSpacing: -.5 }}>How NEXA Transforms Your Prompts</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: ".95rem", maxWidth: 520, margin: "0 auto 2.5rem" }}>Four stages run automatically every time you hit Optimize</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1.25rem" }}>
          {[
            { n: "01", t: "Deconstruct", d: "Breaks your rough input into core intent, target audience, and implicit requirements — even unstated ones." },
            { n: "02", t: "Diagnose", d: "Scans for ambiguity, missing context, security risks like prompt injection and PII exposure, and routes to correct mode." },
            { n: "03", t: "Develop", d: "Applies role assignment, format specification, constraint setting, and chain-of-thought structuring automatically." },
            { n: "04", t: "Deliver", d: "Returns a structured, copy-ready prompt with improvement notes and one-click launch to ChatGPT, Claude or Gemini." },
          ].map(s => (
            <div key={s.n} style={{ background: "#0d0d1a", border: "1px solid #1e1e3a", borderRadius: 14, padding: "1.5rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a1a2e", border: "1px solid #1e1e3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 800, color: "#7F77DD", marginBottom: "1rem", fontFamily: "monospace" }}>{s.n}</div>
              <h3 style={{ fontSize: ".95rem", fontWeight: 700, color: "#EEEDFE", marginBottom: ".4rem" }}>{s.t}</h3>
              <p style={{ fontSize: ".82rem", color: "#94a3b8", lineHeight: 1.6 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <p style={{ textAlign: "center", fontSize: ".72rem", fontWeight: 700, letterSpacing: 3, color: "#5DCAA5", textTransform: "uppercase", marginBottom: ".75rem" }}>What's included</p>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#EEEDFE", marginBottom: "2.5rem", letterSpacing: -.5 }}>Everything You Need — Free</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem" }}>
          {[
            { icon: "🧠", t: "Auto-Complexity Detection", d: "Automatically routes simple prompts to BASIC mode and complex requests to DETAIL mode." },
            { icon: "🛡️", t: "Security Diagnostics", d: "Flags prompt injection, API key exposure, PII, SQL injection, and XSS patterns before they reach the AI." },
            { icon: "📋", t: "20 Starter Templates", d: "Marketing, coding, writing, business, creative, educational — 20 templates across 6 categories." },
            { icon: "🔀", t: "Word Diff View", d: "Side-by-side comparison showing exactly what changed between original and optimized prompt." },
            { icon: "🚀", t: "One-Click Platform Launch", d: "Send your optimized prompt directly to ChatGPT, Claude, or Gemini in one click." },
            { icon: "⚡", t: "Groq-Powered Speed", d: "Primary engine runs on Groq's Llama 3.3 — faster than GPT-4. Falls back to Gemini automatically." },
          ].map(f => (
            <div key={f.t} style={{ background: "#0d0d1a", border: "1px solid #1e1e3a", borderRadius: 14, padding: "1.5rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>{f.icon}</div>
              <h3 style={{ fontSize: ".95rem", fontWeight: 700, color: "#EEEDFE", marginBottom: ".4rem" }}>{f.t}</h3>
              <p style={{ fontSize: ".82rem", color: "#94a3b8", lineHeight: 1.6 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "3rem 1.5rem 5rem", textAlign: "center" }}>
        <div style={{ background: "linear-gradient(135deg,#0d0d1a,#1a1a2e)", border: "1px solid #534AB7", borderRadius: 20, padding: "3rem 2rem" }}>
          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#EEEDFE", marginBottom: ".75rem", letterSpacing: -.5 }}>Start Optimizing for Free</h2>
          <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: ".95rem" }}>Sign in with Google to unlock all features. No credit card. No limits on prompt quality.</p>
          <button onClick={onGetStarted} style={{ background: "linear-gradient(135deg,#534AB7,#1D9E75)", color: "#fff", padding: ".75rem 2rem", borderRadius: 10, fontWeight: 700, fontSize: ".95rem", border: "none", cursor: "pointer" }}>
            Open NEXA Prompt Optimizer →
          </button>
          <p style={{ marginTop: "1.25rem", fontSize: ".78rem", color: "#475569" }}>Free forever · No credit card · Works with ChatGPT, Claude & Gemini</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #1e1e3a", padding: "2rem 1.5rem", textAlign: "center", color: "#475569", fontSize: ".8rem" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: ".75rem", flexWrap: "wrap" }}>
          <a href={`${BASE}/blog`} style={{ color: "#7F77DD" }}>Blog</a>
          <a href={`${BASE}/blog/prompt-engineering-for-beginners`} style={{ color: "#7F77DD" }}>Prompt Engineering Guide</a>
          <a href={`${BASE}/blog/how-to-write-better-chatgpt-prompts`} style={{ color: "#7F77DD" }}>ChatGPT Tips</a>
          <a href={`${BASE}/blog/gemini-prompt-tips`} style={{ color: "#7F77DD" }}>Gemini Tips</a>
        </div>
        <p>© 2026 NEXA Prompt Optimizer — Free AI Prompt Engineering Tool</p>
      </footer>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>{/* end z-index wrapper */}
    </div>
  );
}
