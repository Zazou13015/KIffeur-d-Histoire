"use client";

import { useRef, useState } from "react";
import { signInWithGoogle } from "@/lib/authRedirect";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton({ next }: { next: string }) {
  const redirecting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    if (redirecting.current) return;
    redirecting.current = true;
    setPending(true);
    setError(false);
    try {
      if (await signInWithGoogle(createClient(), window.location.origin, next)) return;
    } catch {
      // La création du client peut échouer avant l'appel OAuth.
    }
    redirecting.current = false;
    setPending(false);
    setError(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" disabled={pending} onClick={handleClick}
        className="rounded border border-stone-300 bg-white px-3 py-2 font-medium text-stone-900 disabled:opacity-60">
        {pending ? "Redirection…" : "Continuer avec Google"}
      </button>
      {error && <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
        Connexion Google impossible. Réessaie.
      </p>}
    </div>
  );
}
