import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { finishGame } from "@/app/solo/actions";
import { getAccount } from "@/lib/account";
import SaveGame from "./SaveGame";

// Bilan fonctionnel pour #24. L'interface de jeu définitive relève de #18/#20.
export default async function ResultPage({ params }: PageProps<"/partie/[id]">) {
  const { id } = await params;
  const account = await getAccount();
  const next = `/partie/${id}`;
  if (account && !account.username) redirect(`/profil?next=${encodeURIComponent(next)}`);
  const anonymous = (await cookies()).has(`histoire-solo-${id}`);
  let result;
  try { result = await finishGame(id); }
  catch {
    return <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl">Bilan indisponible</h1>
      <p>Cette partie est en cours, inaccessible ou expirée.</p>
      <Link href="/">Revenir à l’accueil</Link>
    </main>;
  }
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-12">
    <h1 className="text-2xl">Partie terminée</h1>
    <p>{result.total_points} points · {result.average_accuracy}% de précision · {result.direction === "inverse" ? "Mode inverse" : "Mode date"}</p>
    {!account ? <Link href={`/connexion?next=${encodeURIComponent(next)}`}>Se connecter pour sauvegarder</Link>
      : anonymous ? <SaveGame gameId={id} /> : <p role="status">Partie sauvegardée dans ton compte KFFR.</p>}
    <ol>{result.questions.map(question => <li key={question.question_id}>
      {question.position}. {"title" in question ? question.title : "Question"} — {question.points} points
    </li>)}</ol>
  </main>;
}
