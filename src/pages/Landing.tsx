import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Echo landing page — dark theme with green accents.
 * Design system:
 *   Fonts    : Space Grotesk (headings), Plus Jakarta Sans (body)
 *   Base bg  : #030705
 *   Green    : #34d378 primary / #6ef0a0 accent
 *   Text     : #eef4f0 (main) · #9db0a4 (secondary) · #7c9086 (weak)
 */
export default function Landing() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/workspace-setup", { replace: true });
      else setCheckingAuth(false);
    });
  }, [navigate]);

  const startFlow = () => {
    if (businessName.trim()) sessionStorage.setItem("echo_signup_business_name", businessName.trim());
    navigate("/login?intent=create");
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", background: "#030705", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #34d378", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", background: "#030705", color: "#eef4f0", overflowX: "hidden", fontFamily: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif" }}>
      <style>{`
        @keyframes beam { 0%,100% { opacity: 0.35; } 50% { opacity: 0.6; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .echo-btn-primary:hover { filter: brightness(1.06); }
        .echo-nav-link:hover { color: #fff !important; }
        .echo-outline-btn:hover { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
        ::selection { background: rgba(52,211,120,0.3); }
      `}</style>

      {/* ═════════════ HERO ═════════════ */}
      <section style={{
        position: "relative", width: "100%", minHeight: "100vh", overflow: "hidden",
        background: "radial-gradient(1100px 800px at 74% 42%, rgba(43,180,100,0.20), transparent 60%), linear-gradient(180deg, #071410 0%, #050d09 46%, #020604 100%)",
      }}>
        {/* Background video */}
        <video autoPlay loop muted playsInline style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "72% center", zIndex: 0,
          filter: "saturate(1.1) brightness(1.0)",
        }}>
          <source src="/echo-working.mp4" type="video/mp4" />
        </video>
        {/* Readability veils — softer so the video is clearly visible on the right */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(90deg, rgba(3,7,5,0.9) 0%, rgba(3,7,5,0.72) 28%, rgba(3,7,5,0.45) 50%, rgba(3,7,5,0.22) 75%, rgba(3,7,5,0.15) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(3,7,5,0.35) 0%, rgba(3,7,5,0.1) 26%, rgba(3,7,5,0.1) 66%, rgba(2,6,4,0.8) 100%)", pointerEvents: "none" }} />
        {/* Beams */}
        <div style={{ position: "absolute", top: "-10%", right: "8%", width: 340, height: "130%", transform: "rotate(20deg)", background: "linear-gradient(180deg, rgba(180,255,210,0.10), transparent 70%)", filter: "blur(28px)", animation: "beam 7s ease-in-out infinite", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", top: "-10%", right: "26%", width: 180, height: "130%", transform: "rotate(20deg)", background: "linear-gradient(180deg, rgba(120,240,170,0.08), transparent 65%)", filter: "blur(22px)", animation: "beam 9s ease-in-out infinite", pointerEvents: "none" }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
          maskImage: "radial-gradient(75% 70% at 60% 40%, #000, transparent 92%)",
          WebkitMaskImage: "radial-gradient(75% 70% at 60% 40%, #000, transparent 92%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.55))", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "linear-gradient(90deg, transparent, rgba(52,211,120,0.35), transparent)", pointerEvents: "none" }} />

        {/* NAV */}
        <nav style={{ position: "relative", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1320, margin: "0 auto", padding: "26px 44px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, overflow: "hidden",
                border: "1px solid rgba(52,211,120,0.35)",
                boxShadow: "0 0 20px rgba(52,211,120,0.28)",
                background: "radial-gradient(circle at 50% 40%, #123a24, #071109)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
              }}>
                <img src="/echo-mascot.png" alt="Echo" style={{ width: "150%", height: "auto", marginBottom: -5 }} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafefb" }}>Echo</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <a href="#piliers" className="echo-nav-link" style={{ textDecoration: "none", fontSize: 14.5, fontWeight: 500, color: "#b7c9be" }}>Fonctionnalités</a>
              <a href="#tarifs" className="echo-nav-link" style={{ textDecoration: "none", fontSize: 14.5, fontWeight: 500, color: "#b7c9be" }}>Tarifs</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate("/preview"); }} className="echo-nav-link" style={{ textDecoration: "none", fontSize: 14.5, fontWeight: 500, color: "#b7c9be" }}>Démo</a>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }} className="echo-nav-link" style={{ textDecoration: "none", fontSize: 14.5, fontWeight: 600, color: "#dcece3" }}>Se connecter</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login?intent=create"); }} className="echo-btn-primary"
              style={{ textDecoration: "none", padding: "11px 22px", borderRadius: 999, fontSize: 14.5, fontWeight: 700, color: "#052012",
                background: "linear-gradient(145deg,#6ef0a0,#34d378)", boxShadow: "0 8px 22px -8px rgba(52,211,120,0.55), inset 0 1px 0 rgba(255,255,255,0.4)" }}>
              Démarrer gratuitement
            </a>
          </div>
        </nav>

        {/* HERO COPY */}
        <div style={{ position: "relative", zIndex: 4, maxWidth: 1320, margin: "0 auto", padding: "40px 44px 90px", minHeight: "calc(100vh - 90px)", display: "flex", alignItems: "center" }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 14px", borderRadius: 999, background: "rgba(52,211,120,0.10)", border: "1px solid rgba(52,211,120,0.28)", marginBottom: 26, boxShadow: "0 0 20px rgba(52,211,120,0.12)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 10px #4ade80" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#8ff2b3" }}>Salut ! Je suis Echo, ton centre de contrôle business</span>
            </div>

            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(42px, 5.2vw, 78px)", lineHeight: 0.99, fontWeight: 700, letterSpacing: "-0.035em", color: "#fafefb" }}>
              Ton centre de contrôle business.<br />
              <span style={{ color: "#4ee288" }}>Propulsé par l'IA.</span>
            </h1>

            <p style={{ margin: "26px 0 0", maxWidth: 510, fontSize: 18, lineHeight: 1.6, color: "#9db0a4" }}>
              Une app personnalisée qui centralise chiffres, clients et opérations. L'IA analyse tout et te dit <strong style={{ color: "#eef4f0", fontWeight: 700 }}>quoi faire ensuite.</strong>
            </p>

            {/* Quick-start widget */}
            <div style={{ marginTop: 34, maxWidth: 520, padding: 20, borderRadius: 18,
              background: "linear-gradient(160deg, rgba(14,28,20,0.9), rgba(6,14,10,0.9))",
              border: "1px solid rgba(52,211,120,0.22)",
              boxShadow: "0 24px 50px -24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /></svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#cfe9d8" }}>Construis ton tracker en 60 secondes</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="text" placeholder="Comment s'appelle ta business ?"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") startFlow(); }}
                  style={{ flex: 1, minWidth: 0, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#eef4f0", fontFamily: "inherit", fontSize: 15, outline: "none" }}
                />
                <button onClick={startFlow} className="echo-btn-primary"
                  style={{ flex: "0 0 auto", cursor: "pointer", border: 0, display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 22px", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#052012", background: "linear-gradient(145deg,#6ef0a0,#34d378)", boxShadow: "0 10px 24px -8px rgba(52,211,120,0.5), inset 0 1px 0 rgba(255,255,255,0.4)", fontFamily: "inherit" }}>
                  Démarrer
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5, color: "#7c9086" }}>
                Gratuit · 2 membres max &nbsp;·&nbsp; Déjà un compte ? <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }} style={{ color: "#8ff2b3", textDecoration: "none", fontWeight: 600 }}>Se connecter</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ 4 PILIERS ═════════════ */}
      <section id="piliers" style={{ position: "relative", padding: "110px 44px 40px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(52,211,120,0.09)", border: "1px solid rgba(52,211,120,0.24)", marginBottom: 20 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#7ff0a8" }}>Tout ce qu'Echo fait pour toi</span>
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(34px,4vw,54px)", lineHeight: 1.04, fontWeight: 700, letterSpacing: "-0.03em", color: "#fafefb" }}>
            4 piliers pour centraliser<br />ton business
          </h2>
        </div>

        {/* 01 — IA */}
        <PillarRow num="01" reversed={false}
          title="IA intégrée à ton entreprise"
          desc="Pose des questions directement à ton assistant IA. Il analyse tes revenus, tes clients, tes données et tes opérations pour t'aider à prendre de meilleures décisions."
          leftExtra={
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 440 }}>
              {[
                "Quels clients rapportent le plus ?",
                "Quels revenus ont augmenté ce mois-ci ?",
                "Quelles tâches devraient être prioritaires cette semaine ?",
              ].map((q) => (
                <div key={q} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 14.5, color: "#cfe9d8" }}>
                  <span style={{ color: "#34d378" }}>"</span>{q}<span style={{ color: "#34d378" }}>"</span>
                </div>
              ))}
            </div>
          }
          rightVisual={<AiChatMock />}
        />

        {/* 02 — Client */}
        <PillarRow num="02" reversed
          title="Centre client personnalisé"
          desc="Chaque client peut avoir son propre accès à un portail clair et professionnel. Il voit ses chiffres, ses documents, ses suivis, ses résultats et ses prochaines étapes selon ton type de business."
          leftExtra={
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(52,211,120,0.08)", border: "1px solid rgba(52,211,120,0.22)", fontSize: 14.5, color: "#cfe9d8", maxWidth: 460 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              Moins de messages inutiles, plus de transparence.
            </div>
          }
          rightVisual={<ClientPortalMock />}
        />

        {/* 03 — Équipe */}
        <PillarRow num="03" reversed={false}
          title="Espace équipe intégré"
          desc="Ton équipe discute, reçoit des tâches, suit les priorités et voit ce qui doit être fait. Assigne des tâches à tes employés, suis l'avancement et garde toute l'information au même endroit."
          rightVisual={<TeamMock />}
        />

        {/* 04 — Dashboard */}
        <PillarRow num="04" reversed
          title="Dashboard à ton image"
          desc={<>Ton logo. Tes couleurs. Ton nom. Ton expérience client. Ton système interne. Echo devient <strong style={{ color: "#eef4f0", fontWeight: 700 }}>ton logiciel</strong>, pas juste un outil avec un logo collé dessus.</>}
          leftExtra={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Ton logo", "Tes couleurs", "Ton nom"].map((tag) => (
                <span key={tag} style={{ fontSize: 13, color: "#cfe9d8", padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>{tag}</span>
              ))}
            </div>
          }
          rightVisual={<DashboardMock />}
        />
      </section>

      {/* ═════════════ TARIFS ═════════════ */}
      <section id="tarifs" style={{ position: "relative", padding: "110px 44px", background: "linear-gradient(180deg, #030705, #05100b 40%, #030705)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 900, height: 500, background: "radial-gradient(circle, rgba(52,211,120,0.12), transparent 65%)", filter: "blur(30px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(52,211,120,0.09)", border: "1px solid rgba(52,211,120,0.24)", marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#7ff0a8" }}>Tarifs simples</span>
            </div>
            <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(34px,4vw,54px)", lineHeight: 1.04, fontWeight: 700, letterSpacing: "-0.03em", color: "#fafefb" }}>Choisis ton plan</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, alignItems: "stretch" }}>
            <PricingCard
              name="Gratuit" tagline="Tracker de base, sans frais" price="0 $" priceColor="#fafefb"
              onSelect={() => navigate("/login?intent=create&plan=free")} ctaLabel="Démarrer gratuitement" primary={false}
              features={[
                { label: "Création de ton tracker — sans frais", included: true },
                { label: "Jusqu'à 2 membres", included: true },
                { label: "Dashboard, KPI, tâches, gestion clients", included: true },
                { label: "Tous les conseillers IA Claude", included: true },
                { label: "Sans Stripe ni intégrations", included: false },
              ]}
            />
            <PricingCard
              name="Pro" tagline="Tout débloqué pour une petite équipe" price="27 $" priceColor="#4ee288"
              onSelect={() => navigate("/login?intent=create&plan=pro")} ctaLabel="Choisir Pro" primary
              features={[
                { label: "Tout ce qui est inclus dans Gratuit", included: true, bold: true },
                { label: "Jusqu'à 5 membres", included: true },
                { label: "Personnalisation complète (logo, couleurs, nom)", included: true },
                { label: "Connexion Stripe — track ton revenu réel", included: true },
                { label: "Toutes les intégrations (Google Calendar, etc.)", included: true },
              ]}
            />
            <PricingCard
              name="Business" tagline="Pour les équipes grandissantes" price="57 $" priceColor="#fafefb"
              onSelect={() => navigate("/login?intent=create&plan=business")} ctaLabel="Choisir Business" primary={false}
              features={[
                { label: "Tout ce qui est inclus dans Pro", included: true, bold: true },
                { label: "Jusqu'à 10 membres", included: true },
                { label: "KPI multi-employés avancé", included: true },
                { label: "Support prioritaire", included: true },
              ]}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, marginTop: 38, flexWrap: "wrap" }}>
            {[
              { label: "Paiement sécurisé Stripe", icon: <path d="M4 10h16v11H4z M8 10V7a4 4 0 018 0v3" /> },
              { label: "Annulation à tout moment", icon: <path d="M3 12a9 9 0 109-9M3 12l3-3M3 12l3 3" /> },
              { label: "Accès immédiat après paiement", icon: <path d="M13 2L3 14h7l-1 8 10-12h-7z" /> },
            ].map((t) => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#8ba396" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d378" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ FOOTER ═════════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "48px 44px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, overflow: "hidden", border: "1px solid rgba(52,211,120,0.35)", boxShadow: "0 0 18px rgba(52,211,120,0.25)", background: "radial-gradient(circle at 50% 40%, #123a24, #071109)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <img src="/echo-mascot.png" alt="Echo" style={{ width: "150%", marginBottom: -5 }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: "#fafefb" }}>Echo</div>
              <div style={{ fontSize: 13, color: "#7c9086" }}>Ton centre de contrôle business, propulsé par l'IA</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#6f8479" }}>© 2026 Echo. Tous droits réservés.</div>
        </div>
      </footer>
    </div>
  );
}

// ─── Pillar row component ────────────────────────────────────────────────────

function PillarRow({ num, title, desc, leftExtra, rightVisual, reversed }: {
  num: string; title: string; desc: React.ReactNode; leftExtra?: React.ReactNode; rightVisual: React.ReactNode; reversed: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 64, alignItems: "center", marginBottom: 96, flexWrap: "wrap", flexDirection: reversed ? "row-reverse" : "row" }}>
      <div style={{ flex: 1, minWidth: 320 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "#34d378", letterSpacing: "0.08em", marginBottom: 16 }}>{num}</div>
        <h3 style={{ margin: "0 0 16px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafefb" }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 17, lineHeight: 1.65, color: "#9db0a4", maxWidth: 460 }}>{desc}</p>
        {leftExtra}
      </div>
      <div style={{ flex: 1, minWidth: 340 }}>{rightVisual}</div>
    </div>
  );
}

// ─── Mock previews ───────────────────────────────────────────────────────────

const mockCardStyle: React.CSSProperties = {
  borderRadius: 20, overflow: "hidden",
  background: "linear-gradient(165deg,#0c1611,#070f0b)",
  border: "1px solid rgba(52,211,120,0.16)",
  boxShadow: "0 30px 60px -30px rgba(0,0,0,0.9), 0 0 50px -20px rgba(52,211,120,0.2)",
};

function AiChatMock() {
  return (
    <div style={mockCardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, overflow: "hidden", background: "radial-gradient(circle at 50% 40%, #123a24, #071109)", display: "flex", alignItems: "flex-end", justifyContent: "center", border: "1px solid rgba(52,211,120,0.3)" }}>
          <img src="/echo-mascot.png" alt="" style={{ width: "150%", marginBottom: -4 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fafefb" }}>Echo</div>
          <div style={{ fontSize: 11.5, color: "#7ff0a8" }}>● en ligne</div>
        </div>
      </div>
      <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ alignSelf: "flex-end", maxWidth: "78%", padding: "11px 15px", borderRadius: "14px 14px 4px 14px", background: "linear-gradient(145deg,#34d378,#28b566)", color: "#052012", fontSize: 13.5, fontWeight: 600 }}>Quels clients rapportent le plus ce trimestre ?</div>
        <div style={{ alignSelf: "flex-start", maxWidth: "86%", padding: "13px 15px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "#dbe7e0", fontSize: 13.5, lineHeight: 1.55 }}>
          Tes 3 meilleurs clients ce trimestre :
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Suna Films Media</span><span style={{ color: "#34d378", fontWeight: 700 }}>$18,4k</span></div>
            <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}><div style={{ height: "100%", width: "82%", borderRadius: 999, background: "linear-gradient(90deg,#6ef0a0,#34d378)" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Roux &amp; Bachand</span><span style={{ color: "#34d378", fontWeight: 700 }}>$11,2k</span></div>
            <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}><div style={{ height: "100%", width: "52%", borderRadius: 999, background: "linear-gradient(90deg,#6ef0a0,#34d378)" }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientPortalMock() {
  return (
    <div style={mockCardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 18, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(145deg,#34d378,#1f9d54)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#052012", fontSize: 16 }}>Y</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fafefb" }}>Portail — Yannick Charette</div>
          <div style={{ fontSize: 12, color: "#7c9086" }}>Client actif · depuis mars 2026</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#7ff0a8", background: "rgba(52,211,120,0.12)", border: "1px solid rgba(52,211,120,0.3)", padding: "4px 10px", borderRadius: 999 }}>En cours</span>
      </div>
      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize: 12, color: "#7c9086", marginBottom: 6 }}>Revenu généré</div><div style={{ fontSize: 22, fontWeight: 800, color: "#34d378" }}>$8,200</div></div>
        <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize: 12, color: "#7c9086", marginBottom: 6 }}>Documents</div><div style={{ fontSize: 22, fontWeight: 800, color: "#fafefb" }}>6</div></div>
        <div style={{ gridColumn: "1 / -1", padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 13, color: "#cfe9d8", fontWeight: 600 }}>Prochaine étape</span><span style={{ fontSize: 12, color: "#7c9086" }}>Cette semaine</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#dbe7e0" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fbbf24" }} />Validation du script de tournage</div>
        </div>
      </div>
    </div>
  );
}

function TeamMock() {
  return (
    <div style={{ ...mockCardStyle, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fafefb" }}>Tâches de l'équipe</span>
        <span style={{ fontSize: 12, color: "#7c9086" }}>3 en cours</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { initials: "JB", name: "Jean", task: "Montage vidéo — Client B", due: "échéance vendredi", status: "En cours", statusColor: "#fbbf24", statusBg: "rgba(251,191,36,0.12)", grad: "linear-gradient(145deg,#3f6cf4,#2947c9)" },
          { initials: "SD", name: "Sylvain", task: "Rédiger la proposition", due: "échéance demain", status: "Prêt", statusColor: "#34d378", statusBg: "rgba(52,211,120,0.12)", grad: "linear-gradient(145deg,#a855f7,#7c3aed)" },
          { initials: "LR", name: "Luis", task: "Appel de suivi — Client C", due: "aujourd'hui", status: "À faire", statusColor: "#7c9086", statusBg: "rgba(255,255,255,0.06)", grad: "linear-gradient(145deg,#34d378,#1f9d54)" },
        ].map((row) => (
          <div key={row.initials} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: row.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{row.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "#eef4f0", fontWeight: 500 }}>{row.task}</div>
              <div style={{ fontSize: 11.5, color: "#7c9086" }}>{row.name} · {row.due}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: row.statusColor, background: row.statusBg, padding: "4px 9px", borderRadius: 999 }}>{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "#0d0d0e", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 40px 70px -30px rgba(0,0,0,0.95), 0 0 60px -22px rgba(52,211,120,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 14px", background: "#111113", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
      </div>
      <img src="/exports/dashboard-demo.png" alt="Dashboard Echo" style={{ width: "100%", display: "block" }}
        onError={(e) => {
          // Fallback if screenshot not yet added
          const el = e.currentTarget;
          el.style.display = "none";
          const parent = el.parentElement;
          if (parent) parent.insertAdjacentHTML("beforeend", `<div style="padding:48px;text-align:center;color:#7c9086;font-size:13px;">Aperçu du dashboard<br/><span style="color:#4a5951;font-size:11px;">(ajoute /public/exports/dashboard-demo.png)</span></div>`);
        }} />
    </div>
  );
}

// ─── Pricing card ────────────────────────────────────────────────────────────

function PricingCard({ name, tagline, price, priceColor, features, ctaLabel, onSelect, primary }: {
  name: string; tagline: string; price: string; priceColor: string;
  features: { label: string; included: boolean; bold?: boolean }[];
  ctaLabel: string; onSelect: () => void; primary: boolean;
}) {
  const cardStyle: React.CSSProperties = primary ? {
    position: "relative", display: "flex", flexDirection: "column", padding: "30px 28px", borderRadius: 22,
    background: "linear-gradient(165deg, rgba(20,44,30,0.95), rgba(8,20,13,0.95))",
    border: "1.5px solid rgba(52,211,120,0.5)",
    boxShadow: "0 30px 70px -28px rgba(52,211,120,0.4), 0 0 60px -26px rgba(52,211,120,0.4)",
    transform: "translateY(-8px)",
  } : {
    display: "flex", flexDirection: "column", padding: "30px 28px", borderRadius: 22,
    background: "linear-gradient(165deg,#0c1611,#070f0b)",
    border: "1px solid rgba(255,255,255,0.08)",
  };
  const btnStyle: React.CSSProperties = primary ? {
    textDecoration: "none", textAlign: "center", padding: 13, borderRadius: 12, fontSize: 14.5, fontWeight: 700, cursor: "pointer", border: 0,
    color: "#052012", background: "linear-gradient(145deg,#6ef0a0,#34d378)",
    boxShadow: "0 12px 26px -8px rgba(52,211,120,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
    marginBottom: 24, fontFamily: "inherit",
  } : {
    textDecoration: "none", textAlign: "center", padding: 13, borderRadius: 12, fontSize: 14.5, fontWeight: 700, cursor: "pointer",
    color: "#dcece3", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    marginBottom: 24, fontFamily: "inherit",
  };
  return (
    <div style={cardStyle}>
      {primary && (
        <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#052012", background: "linear-gradient(145deg,#6ef0a0,#34d378)", padding: "5px 14px", borderRadius: 999, boxShadow: "0 6px 16px -4px rgba(52,211,120,0.6)" }}>Populaire</span>
      )}
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fafefb", marginBottom: 6 }}>{name}</div>
      <div style={{ fontSize: 13.5, color: primary ? "#8ba396" : "#7c9086", marginBottom: 20 }}>{tagline}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 700, color: priceColor }}>{price}</span>
        <span style={{ fontSize: 15, color: primary ? "#8ba396" : "#7c9086" }}>/mois</span>
      </div>
      <button onClick={onSelect} className={primary ? "echo-btn-primary" : "echo-outline-btn"} style={btnStyle}>{ctaLabel}</button>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {features.map((f) => (
          <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: f.included ? (f.bold ? "#dbe7e0" : "#c3d3ca") : "#7c9086", fontWeight: f.bold ? 600 : 400 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={f.included ? "#34d378" : "#5b6b62"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto", marginTop: 1 }}>
              {f.included ? <path d="M20 6L9 17l-5-5" /> : <path d="M18 6L6 18M6 6l12 12" />}
            </svg>
            {f.label}
          </div>
        ))}
      </div>
    </div>
  );
}
