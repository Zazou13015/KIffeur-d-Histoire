import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { finishGame, nextQuestion, submitAnswer } from "@/app/solo/actions";
import { Bilan } from "@/components/partie/Bilan";
import { Partie } from "@/components/partie/Partie";
import { getAccount } from "@/lib/account";

function Indisponible({ titre, texte }: { titre: string; texte: string }) {
  return (
    <main className="conteneur grid flex-1 grid-cols-1 content-start gap-3 py-12">
      <h1 className="text-3xl">{titre}</h1>
      <p className="m-0 text-encre-douce">{texte}</p>
      <Link href="/partie/nouvelle" className="font-bold underline underline-offset-4">
        Lancer une nouvelle partie
      </Link>
    </main>
  );
}

// Joue une partie solo : la question en cours, sa correction, puis le bilan.
// Au rechargement, `nextQuestion` rend la question en cours avec son chrono d'origine, ou `null` quand tout est répondu.
export default async function PartiePage({ params, searchParams }: PageProps<"/partie/[id]">) {
  const { id } = await params;
  const { n } = await searchParams;
  const account = await getAccount();
  const suite = `/partie/${id}${typeof n === "string" ? `?n=${encodeURIComponent(n)}` : ""}`;
  if (account && !account.username) redirect(`/profil?next=${encodeURIComponent(suite)}`);
  const anonyme = (await cookies()).has(`histoire-solo-${id}`);

  // Le nombre de questions ne sert qu'à l'affichage (« 4 sur 10 ») : le serveur décide de la fin.
  const total = Math.min(100, Math.max(1, Number.parseInt(typeof n === "string" ? n : "", 10) || 10));

  let question;
  try {
    question = await nextQuestion(id);
  } catch {
    return <Indisponible titre="Partie indisponible" texte="Cette partie est inaccessible ou expirée." />;
  }

  if (question && "date" in question) {
    return <Indisponible titre="Mode inversé" texte="Ce mode n'a pas encore d'écran de jeu." />;
  }

  if (question) {
    return (
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-7">
        <Partie
          gameId={id}
          total={total}
          question={question}
          actions={{ soumettre: submitAnswer, suivante: nextQuestion, terminer: finishGame }}
          connecte={Boolean(account)}
          anonyme={anonyme}
        />
      </main>
    );
  }

  let resultat;
  try {
    resultat = await finishGame(id);
  } catch {
    return <Indisponible titre="Bilan indisponible" texte="Cette partie est inaccessible ou expirée." />;
  }
  return (
    <main className="conteneur grid flex-1 grid-cols-1 content-start gap-6 py-8">
      <Bilan resultat={resultat} connecte={Boolean(account)} anonyme={anonyme} />
    </main>
  );
}
