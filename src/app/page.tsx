import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatHistoricDate, type Precision } from "@/lib/game/dates";
import { signOut } from "./connexion/actions";

type EventRow = {
  id: number;
  title: string;
  year: number;
  month: number | null;
  day: number | null;
  precision: Precision;
};

export default async function Home() {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-12">
        <h1 className="text-3xl font-bold">Kiffeurs d&apos;Histoire</h1>
        <p className="text-stone-600">
          Le site est en ligne, mais pas encore relié à sa base de données. Il manque les variables
          NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email as string | undefined;

  const { data: events, error } = await supabase
    .schema("histoire")
    .from("events")
    .select("id, title, year, month, day, precision")
    .order("year")
    .returns<EventRow[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Kiffeurs d&apos;Histoire</h1>
        {email ? (
          <form action={signOut} className="flex items-center gap-3 text-sm">
            <span className="text-stone-600">{email}</span>
            <button type="submit" className="underline">Déconnexion</button>
          </form>
        ) : (
          <Link href="/connexion" className="text-sm underline">Connexion</Link>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Événements en base</h2>
        {error && (
          <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
            Impossible de lire la base : {error.message}
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {events?.map((event) => (
            <li key={event.id} className="flex justify-between gap-4 border-b border-stone-200 pb-2">
              <span>{event.title}</span>
              <span className="shrink-0 text-stone-500">{formatHistoricDate(event, event.precision)}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
