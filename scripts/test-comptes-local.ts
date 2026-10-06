// Smoke Auth réel, exclusivement sur le projet Supabase local jetable décrit
// dans docs/comptes.md. Clé publique uniquement ; aucun client administrateur.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getProfileUsername, isUsernameTaken, saveProfileUsername } from "../src/lib/profiles";
import { completeAuthCallback } from "../src/lib/authCallback";

async function main() {
  const url = new URL(process.env.KFFR_LOCAL_API_URL ?? "http://127.0.0.1:55321");
  const mail = new URL(process.env.KFFR_LOCAL_MAIL_URL ?? "http://127.0.0.1:55324");
  for (const address of [url,mail]) assert(address.protocol === "http:" && ["127.0.0.1","localhost"].includes(address.hostname), "Tests Auth réservés au local");
  const key = process.env.KFFR_LOCAL_PUBLISHABLE_KEY;
  assert(key?.startsWith("sb_publishable_"), "Une clé publique locale est requise");
  function ssrClient() {
    const values = new Map<string,string>();
    return createServerClient(url.origin, key!, { cookies: {
      getAll: () => [...values].map(([name,value]) => ({ name,value })),
      setAll: cookies => { for (const { name,value } of cookies) values.set(name,value); },
    } });
  }
  const a = ssrClient(), b = ssrClient();
  const run = Date.now();
  const email = `histoire24-${run}@example.test`;
  const password = "Local-test-24-only!";
  const signup = await a.auth.signUp({ email,password });
  assert.ifError(signup.error); assert(signup.data.session && signup.data.user);
  const aId = signup.data.user.id;
  assert.equal((await saveProfileUsername(a,` Joueur\t ${run} `)).error,null);
  assert.equal(await getProfileUsername(a,aId),`Joueur ${run}`);
  const signupB = await b.auth.signUp({ email: `histoire24-b-${run}@example.test`,password });
  assert.ifError(signupB.error); assert(signupB.data.user);
  const bId = signupB.data.user.id;
  assert.equal((await saveProfileUsername(b,`Autre ${run}`)).error,null);
  assert.equal(await isUsernameTaken(a,`Autre ${run}`),true);
  assert.equal((await saveProfileUsername(a,`Autre ${run}`)).error,"Ce pseudo est déjà pris.");
  assert.equal(await getProfileUsername(a,bId),null);
  const forbidden = await a.from("profiles").update({ username: "Volé" }).eq("id",bId).select("username");
  assert.ifError(forbidden.error); assert.deepEqual(forbidden.data,[]);
  assert.equal(await getProfileUsername(b,bId),`Autre ${run}`);
  assert.equal((await saveProfileUsername(a,"x".repeat(41))).error,"Le pseudo ne peut pas dépasser 40 caractères.");
  // Un autre client du même projet représente Contrée : aucune synchronisation.
  const contree = createClient(url.origin,key!,{ auth: { persistSession: false } });
  assert.ifError((await contree.auth.signInWithPassword({ email,password })).error);
  assert.equal((await saveProfileUsername(contree,`Contrée ${run}`)).error,null);
  assert.equal(await getProfileUsername(a,aId),`Contrée ${run}`);
  assert.equal((await saveProfileUsername(a,`Histoire ${run}`)).error,null);
  assert.equal(await getProfileUsername(contree,aId),`Histoire ${run}`);
  assert.ifError((await a.schema("histoire").rpc("ensure_player")).error);
  assert.ifError((await a.schema("histoire").rpc("ensure_player")).error);
  const players = await a.schema("histoire").from("players").select("id,display_name");
  assert.ifError(players.error); assert.deepEqual(players.data,[{ id: aId, display_name: null }]);
  
  const guest = createClient(url.origin,key!,{ auth: { persistSession: false } });
  for (const direction of ["date","inverse"]) {
    const token = randomBytes(32).toString("hex");
    const game = await guest.schema("histoire").rpc("start_game", { p_token: token,p_direction: direction,p_question_count: 1 });
    assert.ifError(game.error);
    const gameId = game.data.game_id;
    const question = await guest.schema("histoire").rpc("next_question",{ p_game_id: gameId,p_token: token });
    assert.ifError(question.error);
    assert.ifError((await guest.schema("histoire").rpc("submit_answer",{
      p_game_id: gameId,p_question_id: question.data.question_id,p_token: token,
      ...(direction === "date" ? { p_year: 2000 } : { p_answer_text: "Réponse locale" }),
    })).error);
    const result = await guest.schema("histoire").rpc("finish_game",{ p_game_id: gameId,p_token: token });
    assert.ifError(result.error);
    assert((await b.schema("histoire").rpc("claim_anonymous_game",{ p_game_id: gameId,p_token: "0".repeat(64) })).error);
    assert.ifError((await a.schema("histoire").rpc("claim_anonymous_game",{ p_game_id: gameId,p_token: token })).error);
    const saved = await a.schema("histoire").rpc("finish_game",{ p_game_id: gameId });
    assert.ifError(saved.error); assert.deepEqual(saved.data,result.data);
    assert((await guest.schema("histoire").rpc("finish_game",{ p_game_id: gameId,p_token: token })).error);
    assert((await a.schema("histoire").rpc("claim_anonymous_game",{ p_game_id: gameId,p_token: token })).error);
  }
  assert.ifError((await a.auth.signOut()).error);
  assert.equal((await a.auth.getUser()).data.user,null);
  assert.ifError((await a.auth.signInWithPassword({ email,password })).error);
  assert.equal((await a.auth.getUser()).data.user?.id,aId);
  
  // Email de récupération capturé par Mailpit LOCAL, jamais envoyé à un tiers.
  assert.ifError((await a.auth.resetPasswordForEmail(email,{ redirectTo: "http://127.0.0.1:3100/auth/callback?next=%2Fnouveau-mot-de-passe" })).error);
  const inbox = await fetch(new URL("/api/v1/messages",mail)).then(response => response.json());
  const message = inbox.messages.find((item: { To: { Address: string }[] }) => item.To.some(to => to.Address === email));
  assert(message,"Email de récupération reçu par Mailpit");
  const content = await fetch(new URL(`/api/v1/message/${message.ID}`,mail)).then(response => response.json());
  const link = (content.Text as string).match(/https?:\/\/[^\s<>]+\/auth\/v1\/verify\?[^\s<>]+/)?.[0];
  assert(link,"Lien de récupération présent");
  assert.equal(new URL(link).origin,url.origin,"Lien limité à Auth local");
  const verified = await fetch(link,{ redirect: "manual" });
  assert.equal(verified.status,303);
  const location = verified.headers.get("location");
  assert(location);
  assert.equal(await completeAuthCallback(a,new URL(location)),"/nouveau-mot-de-passe");
  const newPassword = "Local-new-password-24!";
  assert.ifError((await a.auth.updateUser({ password: newPassword })).error);
  assert.ifError((await a.auth.signOut()).error);
  assert((await a.auth.signInWithPassword({ email,password })).error);
  assert.ifError((await a.auth.signInWithPassword({ email,password: newPassword })).error);
  console.log("OK : Auth local réel, identité commune, RLS, unicité, players, claim date/inverse, déconnexion et reset PKCE.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
