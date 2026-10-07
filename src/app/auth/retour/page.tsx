import { safeNextPath } from "@/lib/authRedirect";
import ReturnToGame from "./ReturnToGame";
export default async function ReturnPage({ searchParams }: PageProps<"/auth/retour">) {
  const { next } = await searchParams;
  // Une page Histoire termine la navigation externe OAuth/email. La navigation
  // suivante est same-site : le cookie anonyme SameSite=Strict revient alors.
  return <main className="mx-auto max-w-sm px-4 py-12"><ReturnToGame next={safeNextPath(typeof next === "string" ? next : null)} /></main>;
}
