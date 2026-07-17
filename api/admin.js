import { createClient } from '@supabase/supabase-js';

// Clé service_role : usage strictement serveur, bypass le RLS. Ne jamais exposer au client.
// Repli sur l'ancien nom SUPABASE_ANON_KEY tant que la variable n'est pas renommée sur Vercel.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, telephone, adminKey, code, actif } = req.body || {};

  // Toutes les actions admin sont protégées par ADMIN_KEY
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (action === 'creer_code') {
    const code = 'JUST-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const dateExpiration = new Date();
    dateExpiration.setDate(dateExpiration.getDate() + 30);

    const { data, error } = await supabase
      .from('abonnements_niger')
      .insert({
        code,
        telephone,
        questions_restantes: 30,
        date_expiration: dateExpiration.toISOString(),
        actif: true
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, code, data });
  }

  if (action === 'lister') {
    const { data, error } = await supabase
      .from('abonnements_niger')
      .select('code, telephone, questions_restantes, date_expiration, actif')
      .order('date_expiration', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, abonnements: data || [] });
  }

  if (action === 'basculer_actif') {
    if (!code) return res.status(400).json({ error: 'Code requis' });

    const { data, error } = await supabase
      .from('abonnements_niger')
      .update({ actif: !!actif })
      .eq('code', code)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, data });
  }

  return res.status(400).json({ error: 'Action invalide' });
}
