// Vrai quand les variables Supabase sont renseignées (en local dans .env.local, en ligne dans Vercel).
// Sans elles, le site affiche une page d'attente au lieu d'une erreur 500.
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
