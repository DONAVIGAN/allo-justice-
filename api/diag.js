// ⚠️ ENDPOINT DE DIAGNOSTIC TEMPORAIRE — À SUPPRIMER après résolution du souci ADMIN_KEY.
// Ne révèle JAMAIS les valeurs des secrets : seulement présence (booléen) et longueur.
// La longueur seule ne permet pas de reconstituer la clé, mais on retire quand même
// ce fichier dès le diagnostic fait (hygiène : pas d'info serveur exposée en prod).
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const k = process.env.ADMIN_KEY;
  return res.status(200).json({
    admin_key_definie: typeof k === 'string' && k.length > 0,
    admin_key_longueur: typeof k === 'string' ? k.length : 0,
    // Signale un espace/retour-ligne parasite en début ou fin (cause n°1 des 401).
    admin_key_espaces_parasites: typeof k === 'string' ? (k !== k.trim()) : false,
    supabase_url_definie: !!process.env.SUPABASE_URL,
    supabase_key_definie: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY),
  });
}
