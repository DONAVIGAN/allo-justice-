import React, { useState, useEffect, useCallback } from "react";

// Palette alignée sur App.js
const NAVY = "#0b1929";
const GOLD = "#b8962e";
const GOLD_LIGHT = "#e8c84a";
const BLUE = "#7a9abf";
const GREEN = "#60c890";
const RED = "#ff7070";
const CARD = "rgba(17,34,64,.6)";
const BORDER = "1px solid rgba(184,150,46,.3)";

const font = "Georgia,serif";

// La clé admin est gardée en mémoire de session uniquement (jamais en localStorage/persistant)
const KEY_STORE = "aj_admin_key";

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(KEY_STORE) || "");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [telephone, setTelephone] = useState("");
  const [creating, setCreating] = useState(false);
  const [nouveauCode, setNouveauCode] = useState(null);
  const [copie, setCopie] = useState(false);

  const [abonnements, setAbonnements] = useState([]);
  const [loadingListe, setLoadingListe] = useState(false);
  const [erreur, setErreur] = useState("");

  const post = useCallback(async (body) => {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, adminKey }),
    });
    let json = {};
    try { json = await r.json(); } catch (_) { /* réponse vide */ }
    return { ok: r.ok, status: r.status, json };
  }, [adminKey]);

  const chargerListe = useCallback(async () => {
    setLoadingListe(true);
    setErreur("");
    const { ok, json } = await post({ action: "lister" });
    if (ok && json.success) {
      setAbonnements(json.abonnements || []);
    } else {
      setErreur(json.error || "Erreur de chargement");
    }
    setLoadingListe(false);
  }, [post]);

  // Vérifie la clé en tentant un "lister" (protégé par ADMIN_KEY côté serveur)
  async function connexion(e) {
    e?.preventDefault();
    if (!adminKey) return;
    setAuthError("");
    const { ok, status, json } = await post({ action: "lister" });
    if (ok && json.success) {
      sessionStorage.setItem(KEY_STORE, adminKey);
      setAbonnements(json.abonnements || []);
      setAuthed(true);
    } else if (status === 401) {
      setAuthError("Clé admin invalide");
    } else {
      setAuthError(json.error || "Erreur de connexion");
    }
  }

  // Auto-connexion si une clé est déjà en session
  useEffect(() => {
    if (adminKey && !authed) { connexion(); }
  }, []); // au montage uniquement

  async function creerCode(e) {
    e?.preventDefault();
    if (!telephone.trim()) return;
    setCreating(true);
    setNouveauCode(null);
    setErreur("");
    setCopie(false);
    const { ok, json } = await post({ action: "creer_code", telephone: telephone.trim() });
    if (ok && json.success) {
      setNouveauCode(json.code);
      setTelephone("");
      chargerListe();
    } else {
      setErreur(json.error || "Échec de création");
    }
    setCreating(false);
  }

  async function basculer(code, actifActuel) {
    setErreur("");
    const { ok, json } = await post({ action: "basculer_actif", code, actif: !actifActuel });
    if (ok && json.success) {
      setAbonnements((list) => list.map((a) => (a.code === code ? { ...a, actif: !actifActuel } : a)));
    } else {
      setErreur(json.error || "Échec de la mise à jour");
    }
  }

  async function copier(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    } catch (_) { /* clipboard indisponible */ }
  }

  function deconnexion() {
    sessionStorage.removeItem(KEY_STORE);
    setAdminKey("");
    setAuthed(false);
    setAbonnements([]);
    setNouveauCode(null);
  }

  const dateFR = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const expire = (iso) => iso && new Date() > new Date(iso);

  // ---------- Écran de connexion ----------
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
        <div style={{ fontSize: 20, fontWeight: "bold", color: GOLD, marginBottom: 8, letterSpacing: 1 }}>ALLÔ JUSTICE · ADMIN</div>
        <div style={{ fontSize: 12, color: BLUE, marginBottom: 24, textAlign: "center" }}>Espace de gestion des abonnements</div>
        <form onSubmit={connexion} style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Clé admin"
            autoFocus
            style={{ background: CARD, border: BORDER, borderRadius: 10, padding: "12px 16px", color: "#e0d4bc", fontSize: 14, width: "100%", outline: "none", marginBottom: 12, fontFamily: font, textAlign: "center" }}
          />
          {authError && <div style={{ color: RED, fontSize: 12, marginBottom: 10, textAlign: "center" }}>{authError}</div>}
          <button type="submit" disabled={!adminKey} style={btn(!adminKey)}>Se connecter</button>
        </form>
      </div>
    );
  }

  // ---------- Tableau de bord ----------
  const actifs = abonnements.filter((a) => a.actif && !expire(a.date_expiration)).length;

  return (
    <div style={{ minHeight: "100vh", background: NAVY, fontFamily: font, color: "#e0d4bc" }}>
      {/* En-tête */}
      <div style={{ background: "linear-gradient(180deg,#112240,#0d1b33)", borderBottom: `2px solid ${GOLD}`, padding: "14px 16px", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 40, height: 40, background: `linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚖️</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#f0e4c8", letterSpacing: 1.5 }}>ADMIN — ALLÔ JUSTICE</div>
          <div style={{ fontSize: 9, color: BLUE, letterSpacing: 1, marginTop: 1 }}>{abonnements.length} abonnement{abonnements.length > 1 ? "s" : ""} · {actifs} actif{actifs > 1 ? "s" : ""}</div>
        </div>
        <button onClick={deconnexion} style={{ marginLeft: "auto", background: "transparent", border: BORDER, borderRadius: 8, padding: "7px 14px", color: BLUE, fontSize: 12, cursor: "pointer", fontFamily: font }}>Déconnexion</button>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* Création de code */}
        <div style={{ background: CARD, border: BORDER, borderRadius: 14, padding: 18, marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: GOLD, marginBottom: 14, letterSpacing: .5 }}>➕ Nouveau code (30 questions / 30 jours)</div>
          <form onSubmit={creerCode} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Téléphone du client (ex: +227 90 00 00 00)"
              style={{ flex: "1 1 240px", background: NAVY, border: BORDER, borderRadius: 10, padding: "11px 14px", color: "#e0d4bc", fontSize: 14, outline: "none", fontFamily: font }}
            />
            <button type="submit" disabled={!telephone.trim() || creating} style={btn(!telephone.trim() || creating)}>
              {creating ? "Création…" : "Générer le code"}
            </button>
          </form>
          {nouveauCode && (
            <div style={{ marginTop: 14, background: "rgba(96,200,144,.1)", border: `1px solid rgba(96,200,144,.35)`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: GREEN, fontSize: 12 }}>Code créé :</span>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#f0e4c8", letterSpacing: 1.5 }}>{nouveauCode}</span>
              <button onClick={() => copier(nouveauCode)} style={{ marginLeft: "auto", background: "transparent", border: BORDER, borderRadius: 8, padding: "6px 12px", color: copie ? GREEN : GOLD, fontSize: 12, cursor: "pointer", fontFamily: font }}>
                {copie ? "✓ Copié" : "Copier"}
              </button>
            </div>
          )}
        </div>

        {erreur && <div style={{ color: RED, fontSize: 13, marginBottom: 14 }}>{erreur}</div>}

        {/* Liste */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: GOLD, letterSpacing: .5 }}>📋 Abonnements</div>
          <button onClick={chargerListe} disabled={loadingListe} style={{ marginLeft: "auto", background: "transparent", border: BORDER, borderRadius: 8, padding: "6px 12px", color: BLUE, fontSize: 12, cursor: "pointer", fontFamily: font }}>
            {loadingListe ? "…" : "↻ Rafraîchir"}
          </button>
        </div>

        {abonnements.length === 0 && !loadingListe && (
          <div style={{ color: BLUE, fontSize: 13, textAlign: "center", padding: 24 }}>Aucun abonnement pour le moment.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {abonnements.map((a) => {
            const estExpire = expire(a.date_expiration);
            const inactif = !a.actif || estExpire;
            return (
              <div key={a.code} style={{ background: CARD, border: BORDER, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: inactif ? .6 : 1 }}>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#f0e4c8", letterSpacing: 1 }}>{a.code}</div>
                  <div style={{ fontSize: 11, color: BLUE, marginTop: 2 }}>{a.telephone || "—"}</div>
                </div>
                <div style={{ fontSize: 12, color: BLUE }}>
                  <span style={{ color: a.questions_restantes > 0 ? GREEN : RED }}>{a.questions_restantes}</span> q. restantes
                </div>
                <div style={{ fontSize: 12, color: estExpire ? RED : BLUE }}>
                  exp. {dateFR(a.date_expiration)}
                </div>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: inactif ? "rgba(255,112,112,.12)" : "rgba(96,200,144,.12)", color: inactif ? RED : GREEN, border: `1px solid ${inactif ? "rgba(255,112,112,.3)" : "rgba(96,200,144,.3)"}` }}>
                  {estExpire ? "expiré" : a.actif ? "actif" : "désactivé"}
                </span>
                <button onClick={() => basculer(a.code, a.actif)} style={{ marginLeft: "auto", background: "transparent", border: BORDER, borderRadius: 8, padding: "6px 12px", color: a.actif ? RED : GREEN, fontSize: 12, cursor: "pointer", fontFamily: font }}>
                  {a.actif ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function btn(disabled) {
  return {
    background: disabled ? "rgba(80,80,80,.3)" : `linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,
    border: "none",
    borderRadius: 12,
    padding: "11px 24px",
    color: disabled ? "#888" : NAVY,
    fontWeight: "bold",
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: font,
  };
}
