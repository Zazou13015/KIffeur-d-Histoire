-- Identité globale : public.profiles existe déjà et reste entièrement inchangé.
comment on column histoire.players.display_name is
  'Legacy : inutilisé pour l’identité KFFR. Lire public.profiles.username, sans copie ni synchronisation.';

create function histoire.ensure_player()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  insert into histoire.players(id) values (auth.uid()) on conflict (id) do nothing;
end;
$$;
revoke all on function histoire.ensure_player() from public, anon, authenticated;
grant execute on function histoire.ensure_player() to authenticated;

-- Les tables de parties sont fermées aux rôles API : definer nécessaire ici.
-- Aucun user_id en paramètre. Verrou et vérifications dans la même transaction.
create function histoire.claim_anonymous_game(p_game_id uuid, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare g histoire.games;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Partie inaccessible';
  end if;
  select * into g from histoire.games where id = p_game_id for update;
  if not found or g.user_id is not null or g.state <> 'finished'
    or g.expires_at is null or g.expires_at <= clock_timestamp()
    or p_token is null or p_token !~ '^[a-f0-9]{64}$'
    or g.anonymous_token_hash is distinct from sha256(convert_to(p_token, 'UTF8')) then
    raise exception using errcode = '42501', message = 'Partie inaccessible';
  end if;
  perform histoire.ensure_player();
  update histoire.games set user_id = auth.uid(), anonymous_token_hash = null, expires_at = null
    where id = g.id;
end;
$$;
revoke all on function histoire.claim_anonymous_game(uuid, text) from public, anon, authenticated;
grant execute on function histoire.claim_anonymous_game(uuid, text) to authenticated;

insert into histoire.migrations_appliquees(version, nom)
values ('20261006233631', 'comptes_sauvegarde');
