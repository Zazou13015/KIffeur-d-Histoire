-- Données de développement local (appliquées par `supabase db reset`, jamais en production).

insert into histoire.themes (slug, name) values
  ('general', 'Général'),
  ('france', 'Dates françaises'),
  ('guerres-mondiales', 'Guerres mondiales'),
  ('inventions', 'Grandes inventions');

insert into histoire.events (slug, title, year, month, day, precision, difficulty) values
  ('prise-bastille', 'La prise de la Bastille', 1789, 7, 14, 'jour', 1),
  ('armistice-1918', 'L''armistice de la Première Guerre mondiale', 1918, 11, 11, 'jour', 1),
  ('chute-mur-berlin', 'La chute du mur de Berlin', 1989, 11, 9, 'jour', 2),
  ('debarquement-normandie', 'Le débarquement de Normandie', 1944, 6, 6, 'jour', 1),
  ('sacre-charlemagne', 'Le sacre de Charlemagne', 800, 12, 25, 'jour', 3),
  ('imprimerie-gutenberg', 'L''imprimerie de Gutenberg', 1450, null, null, 'annee', 3),
  ('premier-pas-lune', 'Le premier pas sur la Lune', 1969, 7, 21, 'jour', 2),
  ('mort-cesar', 'L''assassinat de Jules César', -44, 3, 15, 'jour', 3),
  ('guerre-froide', 'La guerre froide', 1947, null, null, 'annee', 2),
  ('ve-republique', 'La naissance de la Ve République', 1958, 10, 4, 'jour', 2);

insert into histoire.event_aliases (event_id, alias)
select id, a.alias from histoire.events e
join (values
  ('guerre-froide', 'Guerre froide'),
  ('guerre-froide', 'Cold War'),
  ('premier-pas-lune', 'Apollo 11'),
  ('debarquement-normandie', 'Jour J'),
  ('debarquement-normandie', 'D-Day'),
  ('armistice-1918', 'Armistice de 1918')
) as a(slug, alias) on a.slug = e.slug;

insert into histoire.event_themes (event_id, theme_id)
select e.id, t.id from histoire.events e cross join histoire.themes t where t.slug = 'general';

insert into histoire.event_themes (event_id, theme_id)
select e.id, t.id from histoire.events e join histoire.themes t on t.slug = 'france'
where e.slug in ('prise-bastille', 'sacre-charlemagne', 've-republique');

insert into histoire.event_themes (event_id, theme_id)
select e.id, t.id from histoire.events e join histoire.themes t on t.slug = 'guerres-mondiales'
where e.slug in ('armistice-1918', 'debarquement-normandie');

insert into histoire.event_themes (event_id, theme_id)
select e.id, t.id from histoire.events e join histoire.themes t on t.slug = 'inventions'
where e.slug in ('imprimerie-gutenberg', 'premier-pas-lune');
