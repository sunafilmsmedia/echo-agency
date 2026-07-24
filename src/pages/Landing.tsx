import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingChat } from "@/components/landing/LandingChat";

/**
 * Echo landing — v2 (editorial premium).
 * Palette (ONLY): #0A0A0A · #F5F5F0 · #00C853.
 * Typography: Space Grotesk (sans grotesque) + Georgia serif italic (single-word accents).
 * Rule: text is the design. No stock illustrations, no rainbow gradients.
 * The video (was the hero background) is now a looped section at the bottom of the page.
 */
const BLACK = "#0A0A0A";
const OFFWHITE = "#F5F5F0";
const GREEN = "#00C853";
const MUTED = "#8a8a85";
const RULE = "rgba(245,245,240,0.10)";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS  = "'Space Grotesk', -apple-system, system-ui, sans-serif";
const BODY  = "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif";

export default function Landing() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/workspace-setup", { replace: true });
      else setCheckingAuth(false);
    });
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${GREEN}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ background: BLACK, color: OFFWHITE, fontFamily: BODY, overflowX: "hidden" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        ::selection { background: ${GREEN}; color: ${BLACK}; }
        .echo-cta:hover { background: ${GREEN}; color: ${BLACK}; border-color: ${GREEN}; }
        .echo-nav-link:hover { color: ${OFFWHITE} !important; }
        .serif-italic { font-family: ${SERIF}; font-style: italic; font-weight: 400; color: ${GREEN}; }

        @media (max-width: 900px) {
          .echo-hide-mobile { display: none !important; }
          .echo-hero-h1 { font-size: 48px !important; line-height: 1.02 !important; }
          .echo-section-h2 { font-size: 34px !important; }
          .echo-pillar-row { flex-direction: column !important; gap: 32px !important; margin-bottom: 72px !important; }
          .echo-pillar-row.reversed { flex-direction: column !important; }
          .echo-pricing-grid { grid-template-columns: 1fr !important; }
          .echo-pricing-pro { transform: none !important; }
          .echo-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .echo-nav-wrap { padding: 20px !important; }
          .echo-section { padding-left: 20px !important; padding-right: 20px !important; }
          .echo-video-copy h2 { font-size: 40px !important; }
        }
      `}</style>

      {/* ═════════════ URGENCY BAR ═════════════ */}
      <div style={{ borderBottom: `1px solid ${RULE}`, background: BLACK }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "10px 44px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 12.5, fontFamily: BODY, letterSpacing: "0.02em" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: GREEN, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, animation: "pulseDot 1.6s ease-in-out infinite" }} />
            NOW
          </span>
          <span style={{ color: MUTED }}>Founder's cohort — 12 places restantes</span>
        </div>
      </div>

      {/* ═════════════ NAV ═════════════ */}
      <nav className="echo-nav-wrap" style={{ position: "sticky", top: 0, zIndex: 20, background: `${BLACK}f2`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${RULE}`, padding: "18px 44px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, overflow: "hidden", background: BLACK, border: `1px solid ${RULE}`, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <img src="/echo-mascot.png" alt="Echo" style={{ width: "150%", marginBottom: -3 }} />
              </div>
              <span style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: OFFWHITE }}>Echo</span>
            </div>
            <div className="echo-hide-mobile" style={{ display: "flex", alignItems: "center", gap: 30 }}>
              {[
                { label: "Fonctionnalités", href: "#pillars" },
                { label: "Preuve", href: "#proof" },
                { label: "Tarifs", href: "#pricing" },
                { label: "FAQ", href: "#faq" },
              ].map((l) => (
                <a key={l.href} href={l.href} className="echo-nav-link" style={{ textDecoration: "none", fontSize: 13.5, fontWeight: 500, color: MUTED, letterSpacing: "0.01em" }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }} className="echo-nav-link"
              style={{ textDecoration: "none", fontSize: 13.5, fontWeight: 500, color: MUTED, letterSpacing: "0.01em" }}>
              Login
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login?intent=create"); }} className="echo-cta"
              style={{ textDecoration: "none", padding: "9px 18px", fontSize: 13.5, fontWeight: 600, color: BLACK, background: GREEN, borderRadius: 999, transition: "all 0.15s ease", border: `1px solid ${GREEN}`, display: "inline-flex", alignItems: "center", gap: 6 }}>
              Book a Call
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ═════════════ HERO ═════════════ */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        {/* Rising dashboard chart — background */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.6,
          maskImage: `radial-gradient(ellipse 70% 55% at 50% 65%, #000 0%, transparent 78%)`,
          WebkitMaskImage: `radial-gradient(ellipse 70% 55% at 50% 65%, #000 0%, transparent 78%)`,
        }}>
          <RisingDashboardChart />
        </div>
        {/* Green ambient glow */}
        <div aria-hidden style={{
          position: "absolute", left: "50%", top: "58%", transform: "translate(-50%, -50%)",
          width: 900, height: 500, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(0,200,83,0.18) 0%, transparent 65%)`,
          filter: "blur(60px)", pointerEvents: "none", zIndex: 0,
        }} />

        <div className="echo-section" style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "140px 44px 120px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "6px 14px", borderRadius: 999, border: `1px solid ${RULE}`, marginBottom: 40, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, background: BLACK }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, boxShadow: `0 0 10px ${GREEN}` }} />
          348 fondateurs actifs
        </div>

        <h1 className="echo-hero-h1" style={{ margin: 0, fontFamily: SANS, fontSize: "clamp(52px, 6.5vw, 92px)", lineHeight: 0.98, fontWeight: 500, letterSpacing: "-0.035em", color: OFFWHITE }}>
          Ton <span className="serif-italic">business</span> centralisé.
          <br />
          Ton copilote IA <span className="serif-italic">opérationnel</span>.
        </h1>

        <p style={{ margin: "40px auto 0", maxWidth: 640, fontSize: 18.5, lineHeight: 1.55, color: MUTED }}>
          Une seule app. Tes chiffres, tes clients, ton équipe, tes opérations. L'IA analyse, décide, exécute — <span style={{ color: OFFWHITE }}>52 500 $ MRR moyen</span> chez nos utilisateurs après 6 mois.
        </p>

        <div style={{ marginTop: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login?intent=create"); }} className="echo-cta"
            style={{ textDecoration: "none", padding: "16px 28px", fontSize: 15, fontWeight: 600, color: BLACK, background: GREEN, borderRadius: 999, transition: "all 0.15s ease", border: `1px solid ${GREEN}`, display: "inline-flex", alignItems: "center", gap: 8 }}>
            Book a Call
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
          <button onClick={() => setChatOpen(true)}
            style={{ cursor: "pointer", padding: "16px 28px", fontSize: 15, fontWeight: 500, color: OFFWHITE, background: "transparent", borderRadius: 999, border: `1px solid ${RULE}`, fontFamily: "inherit" }}>
            Voir en action →
          </button>
        </div>
        </div>
      </section>

      {/* ═════════════ PROBLEM vs SOLUTION ═════════════ */}
      <section className="echo-section" style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "60px 44px 120px" }}>
        <div className="echo-vs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch" }}>
          {/* Avant — plain */}
          <div style={{ padding: "40px 32px", border: `1px solid ${RULE}`, borderRadius: 12, background: "transparent" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>Avant</p>
            <h3 style={{ margin: "16px 0 24px", fontFamily: SANS, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", color: OFFWHITE }}>
              8 outils. <span className="serif-italic">Zéro</span> vue d'ensemble.
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Notion pour la doc, Airtable pour le CRM, Slack pour l'équipe",
                "Des chiffres qui vivent dans Excel, pas de consolidation",
                "3 heures par semaine à recopier de la data",
                "Aucune IA qui sait où regarder pour te conseiller",
              ].map((t) => (
                <li key={t} style={{ display: "flex", gap: 12, fontSize: 14.5, lineHeight: 1.5, color: MUTED }}>
                  <span style={{ color: OFFWHITE, opacity: 0.35, flex: "0 0 auto" }}>—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Avec Echo — green treatment */}
          <div style={{
            position: "relative",
            padding: "40px 32px",
            border: `1px solid ${GREEN}`,
            borderRadius: 12,
            background: `linear-gradient(180deg, rgba(0,200,83,0.10), rgba(0,200,83,0.03))`,
            boxShadow: `0 0 60px -20px rgba(0,200,83,0.35), inset 0 1px 0 rgba(0,200,83,0.15)`,
            overflow: "hidden",
          }}>
            {/* Corner glow */}
            <div aria-hidden style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,200,83,0.3), transparent 60%)`, filter: "blur(30px)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: GREEN }}>Avec Echo</p>
              <h3 style={{ margin: "16px 0 24px", fontFamily: SANS, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", color: OFFWHITE }}>
                Une app. <span className="serif-italic">Toute</span> ton opération.
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  "Dashboard, CRM, KPI, tâches, portail client au même endroit",
                  "L'IA connaît tes chiffres et te dit quoi prioriser aujourd'hui",
                  "Ton équipe voit ses tâches sans réunion de statut",
                  "Tes clients voient leurs résultats en temps réel — zéro question",
                ].map((t) => (
                  <li key={t} style={{ display: "flex", gap: 12, fontSize: 14.5, lineHeight: 1.5, color: OFFWHITE }}>
                    <span style={{ color: GREEN, flex: "0 0 auto" }}>▲</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ INTÉGRATIONS ═════════════ */}
      <section id="proof" className="echo-section" style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "40px 44px 120px" }}>
        {/* Subtle green glow */}
        <div aria-hidden style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%, -50%)", width: 700, height: 400, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,200,83,0.08), transparent 65%)`, filter: "blur(50px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", marginBottom: 44 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>Intégrations natives</p>
          <h2 className="echo-section-h2" style={{ margin: "12px 0 20px", fontFamily: SANS, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", color: OFFWHITE, lineHeight: 1.05 }}>
            Chaque tracker est <span className="serif-italic">personnalisé</span> à ton business.
          </h2>
          <p style={{ margin: 0, maxWidth: 640, fontSize: 16.5, lineHeight: 1.55, color: MUTED }}>
            Connecte tes outils existants et Echo aggrège tout dans un dashboard unifié. Tes chiffres vivants, pas des copies statiques.
          </p>
        </div>

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            {
              name: "Stripe",
              desc: "Ton MRR réel, tes paiements récents, ton churn. Mis à jour en direct.",
              icon: (<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.163 22.99 8.386 24 11.734 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.611-7.305z"/>),
            },
            {
              name: "Google Calendar",
              desc: "Tes tournages, RDV et deadlines s'affichent avec ton dashboard.",
              icon: (<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
            },
            {
              name: "Calendly",
              desc: "Compteur automatique de RDV/semaine dans tes KPI de croissance.",
              icon: (<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="14" r="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></>),
            },
            {
              name: "Comptabilité",
              desc: "QuickBooks, Wave, Fresh. Tes dépenses catégorisées automatiquement.",
              icon: (<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>),
            },
          ].map((integ) => (
            <div key={integ.name}
              style={{
                padding: "24px 22px", border: `1px solid ${RULE}`, borderRadius: 12,
                background: BLACK, transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = GREEN;
                e.currentTarget.style.boxShadow = `0 0 40px -18px rgba(0,200,83,0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = RULE;
                e.currentTarget.style.boxShadow = "none";
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,200,83,0.10)", border: `1px solid rgba(0,200,83,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{integ.icon}</svg>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: OFFWHITE, marginBottom: 8 }}>{integ.name}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>{integ.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ position: "relative", marginTop: 32, fontSize: 13, color: MUTED, textAlign: "center" }}>
          + des dizaines d'autres outils via webhooks personnalisés
        </p>
      </section>

      {/* ═════════════ 4 PILLARS — restyled ═════════════ */}
      <section id="pillars" className="echo-section" style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 44px 120px" }}>
        <div style={{ marginBottom: 72 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>Fonctionnalités</p>
          <h2 className="echo-section-h2" style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", color: OFFWHITE, lineHeight: 1.05 }}>
            4 piliers pour centraliser <span className="serif-italic">ton business</span>.
          </h2>
        </div>

        <PillarRow
          num="01"
          eyebrow="IA · analyse en continu"
          title="Ton copilote qui connaît tes chiffres"
          desc="Pose des questions directement. Il analyse ton MRR, tes clients, tes tâches, tes marges — et te dit quoi prioriser aujourd'hui."
        />
        <PillarRow
          num="02"
          eyebrow="Portail client · white-label"
          title="Chaque client voit ses résultats en direct"
          desc="Portail personnalisé pour chaque client. Ils voient leurs chiffres, documents et prochaines étapes — tu réponds à zéro question de statut."
        />
        <PillarRow
          num="03"
          eyebrow="Équipe · workflows intégrés"
          title="Ton équipe sait quoi faire, sans réunion"
          desc="Tâches assignables, priorités visibles, listes par personne. Sandra et René savent ce qu'il faut livrer sans check-in."
        />
        <PillarRow
          num="04"
          eyebrow="Dashboard · ton identité"
          title="Ton logo, tes couleurs, ton nom"
          desc="Echo devient ton logiciel interne. Aucun client ne devine que c'est un outil tiers."
          last
        />
      </section>

      {/* ═════════════ STATS BAR ═════════════ */}
      <section className="echo-section" style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 44px 120px" }}>
        <div className="echo-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
          {[
            { value: "348", label: "Fondateurs actifs" },
            { value: "12.1 M $", label: "Revenu généré sur Echo" },
            { value: "52 500 $", label: "MRR moyen après 6 mois" },
            { value: "3 min", label: "Setup complet" },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: "40px 24px", borderRight: i === arr.length - 1 ? "none" : `1px solid ${RULE}` }}>
              <div style={{ fontFamily: SANS, fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em", color: OFFWHITE }}>{s.value}</div>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════════ PRICING ═════════════ */}
      <section id="pricing" className="echo-section" style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "40px 44px 120px" }}>
        <div aria-hidden style={{ position: "absolute", left: "50%", top: 240, transform: "translateX(-50%)", width: 700, height: 400, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,200,83,0.10), transparent 65%)`, filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", marginBottom: 60 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>Tarifs</p>
          <h2 className="echo-section-h2" style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", color: OFFWHITE, lineHeight: 1.05 }}>
            Choisis ton <span className="serif-italic">plan</span>.
          </h2>
        </div>

        <div className="echo-pricing-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          <PricingCard
            name="Gratuit"
            tagline="Tracker de base, sans frais"
            price="0 $"
            ctaLabel="Démarrer gratuitement"
            onSelect={() => navigate("/login?intent=create&plan=free")}
            features={[
              "Création de ton tracker — sans frais",
              "Jusqu'à 2 membres",
              "Dashboard, KPI, tâches, gestion clients",
              "Tous les conseillers IA Claude",
            ]}
          />
          <PricingCard
            name="Pro"
            tagline="Tout débloqué pour une petite équipe"
            price="27 $"
            featured
            ctaLabel="Choisir Pro"
            onSelect={() => navigate("/login?intent=create&plan=pro")}
            features={[
              "Tout ce qui est inclus dans Gratuit",
              "Jusqu'à 5 membres",
              "Personnalisation complète (logo, couleurs, nom)",
              "Connexion Stripe — track ton revenu réel",
              "Toutes les intégrations (Google Calendar, etc.)",
            ]}
          />
          <PricingCard
            name="Business"
            tagline="Pour les équipes grandissantes"
            price="57 $"
            ctaLabel="Choisir Business"
            onSelect={() => navigate("/login?intent=create&plan=business")}
            features={[
              "Tout ce qui est inclus dans Pro",
              "Jusqu'à 10 membres",
              "KPI multi-employés avancé",
              "Support prioritaire",
            ]}
          />
        </div>
      </section>

      {/* ═════════════ FAQ ═════════════ */}
      <section id="faq" className="echo-section" style={{ maxWidth: 820, margin: "0 auto", padding: "40px 44px 120px" }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>FAQ</p>
          <h2 className="echo-section-h2" style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", color: OFFWHITE, lineHeight: 1.05 }}>
            Les <span className="serif-italic">vraies</span> questions.
          </h2>
        </div>
        <div>
          {[
            { q: "Ça remplace quoi exactement ?", a: "Notion + Airtable + Slack + un CRM léger + un dashboard analytics + un portail client. Une seule facture, un seul login, une seule source de vérité." },
            { q: "L'IA lit-elle vraiment mes données ?", a: "Oui. Elle a accès à ton dashboard, ton CRM, tes KPI et tes tâches. Elle répond avec des chiffres à toi — jamais des généralités." },
            { q: "Combien de temps pour être opérationnel ?", a: "3 minutes pour créer l'espace. 1 heure pour importer tes clients. Les fondateurs actifs ont fait leur premier RDV client via Echo dans la semaine qui suit." },
            { q: "Puis-je annuler ?", a: "Oui, à tout moment. Aucun engagement. Le plan gratuit reste utilisable indéfiniment." },
            { q: "Mes clients savent-ils que c'est Echo ?", a: "Non. Ton logo, tes couleurs, ton nom de domaine (Business+). Zéro branding Echo visible côté client." },
          ].map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
        <div style={{ marginTop: 60, textAlign: "center" }}>
          <p style={{ margin: "0 0 20px", fontSize: 15, color: MUTED }}>Une autre question ?</p>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login?intent=create"); }} className="echo-cta"
            style={{ textDecoration: "none", padding: "16px 28px", fontSize: 15, fontWeight: 600, color: BLACK, background: GREEN, borderRadius: 999, transition: "all 0.15s ease", border: `1px solid ${GREEN}`, display: "inline-flex", alignItems: "center", gap: 8 }}>
            Book a Call
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>
      </section>

      {/* ═════════════ VIDEO SECTION — bottom, looping, black gradient bottom-to-top ═════════════ */}
      <section style={{ position: "relative", width: "100%", overflow: "hidden", borderTop: `1px solid ${RULE}` }}>
        <video autoPlay loop muted playsInline
          style={{ display: "block", width: "100%", height: "auto", maxHeight: "80vh", objectFit: "cover" }}>
          <source src="/echo-working.mp4" type="video/mp4" />
        </video>

        {/* Dark gradient bottom → top (heavy black at bottom for text legibility) */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(0deg, ${BLACK} 0%, rgba(10,10,10,0.85) 30%, rgba(10,10,10,0.15) 65%, transparent 100%)`,
          pointerEvents: "none",
        }} />

        {/* Copy overlaid at bottom of the video */}
        <div className="echo-video-copy" style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "80px 44px 100px", maxWidth: 880, margin: "0 auto",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: GREEN }}>
            Setup → Valeur
          </p>
          <h2 style={{ margin: "16px 0 0", fontFamily: SANS, fontSize: 56, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05, color: OFFWHITE }}>
            Du setup à la valeur <span className="serif-italic">en minutes</span>.
          </h2>
          <p style={{ margin: "24px auto 0", maxWidth: 620, fontSize: 17, lineHeight: 1.55, color: "rgba(245,245,240,0.75)" }}>
            Créer ton système Echo est délibérément simple. Ajoute ton business une fois, définis comment tu fonctionnes, et ton centre de contrôle est prêt à opérer — pas de config complexe, pas de setup technique.
          </p>
        </div>
      </section>

      {/* ═════════════ FOOTER ═════════════ */}
      <footer style={{ borderTop: `1px solid ${RULE}`, padding: "40px 44px", background: BLACK }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", background: BLACK, border: `1px solid ${RULE}`, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <img src="/echo-mascot.png" alt="Echo" style={{ width: "150%", marginBottom: -3 }} />
            </div>
            <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: OFFWHITE }}>Echo</span>
          </div>
          <div style={{ fontSize: 12.5, color: MUTED }}>© 2026 Echo · Tous droits réservés</div>
        </div>
      </footer>

      {/* Chat modal (interactive 60-second tracker builder) */}
      {chatOpen && (
        <div onClick={() => setChatOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, marginTop: 40, marginBottom: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: GREEN, margin: "0 0 12px" }}>
                Construis ton tracker en 60 secondes
              </p>
              <button onClick={() => setChatOpen(false)}
                style={{ background: "none", border: `1px solid ${RULE}`, color: OFFWHITE, cursor: "pointer", fontSize: 12, padding: "6px 12px", borderRadius: 999, fontFamily: "inherit" }}>
                ← Fermer
              </button>
            </div>
            <LandingChat onCreateClick={() => navigate("/login?intent=create")} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pillar row — restyled minimal ────────────────────────────────────────────

function PillarRow({ num, eyebrow, title, desc, last }: {
  num: string; eyebrow: string; title: string; desc: string; last?: boolean;
}) {
  return (
    <div className="echo-pillar-row"
      style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 1.4fr",
        gap: 40,
        alignItems: "start",
        padding: "40px 0",
        borderBottom: last ? "none" : `1px solid ${RULE}`,
      }}>
      <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: GREEN, letterSpacing: "-0.02em" }}>{num}</div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{eyebrow}</p>
        <h3 style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: OFFWHITE, lineHeight: 1.15 }}>{title}</h3>
      </div>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: MUTED, maxWidth: 460 }}>{desc}</p>
    </div>
  );
}

// ─── Pricing card — clean editorial ───────────────────────────────────────────

function PricingCard({ name, tagline, price, features, ctaLabel, onSelect, featured }: {
  name: string; tagline: string; price: string;
  features: string[];
  ctaLabel: string; onSelect: () => void; featured?: boolean;
}) {
  return (
    <div className={featured ? "echo-pricing-pro" : ""}
      style={{
        position: "relative",
        padding: "36px 30px",
        borderRadius: 12,
        border: `1px solid ${featured ? GREEN : RULE}`,
        background: featured ? "rgba(0,200,83,0.03)" : "transparent",
        display: "flex",
        flexDirection: "column",
        transform: featured ? "translateY(-8px)" : "none",
      }}>
      {featured && (
        <span style={{
          position: "absolute", top: -12, left: 24,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
          color: BLACK, background: GREEN, padding: "4px 10px", borderRadius: 999,
        }}>Le plus populaire</span>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}>{name}</div>
      <div style={{ marginTop: 20, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: SANS, fontSize: 52, fontWeight: 500, letterSpacing: "-0.03em", color: OFFWHITE }}>{price}</span>
        <span style={{ fontSize: 14, color: MUTED }}>/mois</span>
      </div>
      <p style={{ margin: "12px 0 32px", fontSize: 14, color: MUTED, lineHeight: 1.5 }}>{tagline}</p>

      <button onClick={onSelect}
        style={{
          cursor: "pointer", padding: "14px 20px", borderRadius: 999,
          fontSize: 14, fontWeight: 600, fontFamily: "inherit",
          color: featured ? BLACK : OFFWHITE,
          background: featured ? GREEN : "transparent",
          border: `1px solid ${featured ? GREEN : RULE}`,
          marginBottom: 28,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!featured) { e.currentTarget.style.background = GREEN; e.currentTarget.style.color = BLACK; e.currentTarget.style.borderColor = GREEN; }
        }}
        onMouseLeave={(e) => {
          if (!featured) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = OFFWHITE; e.currentTarget.style.borderColor = RULE; }
        }}>
        {ctaLabel}
      </button>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, lineHeight: 1.5, color: OFFWHITE }}>
            <span style={{ color: GREEN, flex: "0 0 auto", marginTop: 1 }}>▲</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Rising Dashboard chart — SVG backdrop for the hero ─────────────────────

function RisingDashboardChart() {
  // A stylized area chart trending up-right, plus a subtle grid.
  // Colors are hard-coded to the palette so it stays consistent.
  return (
    <svg
      viewBox="0 0 1400 700"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="rd-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00C853" stopOpacity="0.35" />
          <stop offset="60%"  stopColor="#00C853" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#00C853" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rd-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#00C853" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00C853" stopOpacity="1" />
        </linearGradient>
        <pattern id="rd-grid" width="70" height="70" patternUnits="userSpaceOnUse">
          <path d="M 70 0 L 0 0 0 70" fill="none" stroke="rgba(245,245,240,0.04)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* subtle grid */}
      <rect x="0" y="0" width="1400" height="700" fill="url(#rd-grid)" />

      {/* Rising area under the line */}
      <path
        d="M 0 620
           C 200 600, 340 580, 520 520
           C 700 460, 820 440, 980 340
           C 1140 240, 1240 200, 1400 100
           L 1400 700 L 0 700 Z"
        fill="url(#rd-area)"
      />
      {/* The line itself */}
      <path
        d="M 0 620
           C 200 600, 340 580, 520 520
           C 700 460, 820 440, 980 340
           C 1140 240, 1240 200, 1400 100"
        fill="none"
        stroke="url(#rd-line)"
        strokeWidth="2"
      />
      {/* Data points */}
      {[
        [200, 605], [520, 520], [820, 445], [1100, 275], [1350, 130],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="10" fill="#00C853" opacity="0.15" />
          <circle cx={x} cy={y} r="4"  fill="#00C853" />
        </g>
      ))}
    </svg>
  );
}

// ─── FAQ item ────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${RULE}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "transparent", border: 0, cursor: "pointer",
          padding: "24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          textAlign: "left", fontFamily: "inherit",
        }}>
        <span style={{ fontFamily: SANS, fontSize: 18, fontWeight: 500, color: OFFWHITE, letterSpacing: "-0.01em" }}>{q}</span>
        <span style={{ fontSize: 20, color: MUTED, fontFamily: SANS, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s ease" }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 24, fontSize: 15, lineHeight: 1.6, color: MUTED, maxWidth: 640 }}>
          {a}
        </div>
      )}
    </div>
  );
}
