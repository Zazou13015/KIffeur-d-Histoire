-- #83 : niveau de chaque événement (1 Débutant, 2 Intermédiaire, 3 Expert), titre de question lisible,
-- packs « incontournables » refaits avec des dates connues de tous.
-- Aucune signature existante ne change : le site en ligne continue de fonctionner avant la fusion.
-- Source des valeurs : content/niveaux-evenements.csv et kiffeurs-ready-collection-events-v18.csv.

-- 1. Niveau et titre de question. Un événement ajouté plus tard sans niveau est rangé en Expert.
alter table histoire.events
  add column niveau smallint not null default 3 check (niveau between 1 and 3),
  add column titre_question text;
comment on column histoire.events.niveau is '1 Débutant, 2 Intermédiaire, 3 Expert. Une partie Intermédiaire tire les niveaux 1 et 2.';
comment on column histoire.events.titre_question is 'Titre affiché pendant la question, sans chiffre qui donnerait la date. Vide : titre masqué automatiquement.';

-- Débutant et Intermédiaire (numéros EVT-xxxx) ; tous les autres restent Expert.
update histoire.events set niveau = 1 where substr(id, 5) = any('{0002,0003,0004,0005,0006,0007,0008,0009,0012,0013,0014,0015,0016,0017,0018,0022,0023,0024,0025,0026,0027,
0029,0030,0031,0032,0033,0036,0037,0042,0044,0048,0049,0052,0053,0054,0055,0061,0062,0063,0064,0065,0066,
0067,0069,0070,0073,0075,0076,0077,0078,0082,0083,0090,0091,0092,0093,0094,0095,0097,0099,0100,0101,0102,
0110,0111,0113,0114,0115,0116,0118,0120,0122,0132,0133,0142,0143,0145,0154,0166,0168,0169,0170,0173,0174,
0175,0179,0180,0181,0184,0186,0187,0188,0192,0200,0201,0207,0210,0227,0243,0244,0250,0251,0252,0265,0266,
0271,0273,0275,0280,0286,0287,0288,0289,0295,0298,0299,0302,0307,0317,0318,0320,0324,0325,0327,0328,0329,
0330,0333,0334,0337,0338,0339,0340,0341,0342,0345,0346,0347,0348,0349,0353,0354,0355,0356,0357,0359,0361,
0362,0364,0365,0368,0373,0374,0376,0378,0381,0385,0386,0387,0388,0390,0395,0396,0398,0399,0401,0406,0410,
0411,0412,0413,0414,0417,0418,0419,0422,0426,0429,0431,0433,0434,0436,0438,0440,0441,0442,0443,0444,0446,
0447,0448,0466,0471,0472,0473,0477,0478,0482,0484,0488,0494,0497,0502,0503,0504,0505,0510,0513,0518,0519,
0520,0521,0522,0523,0524,0525,0529,0530,0533,0534,0537,0539,0542,0545,0546,0547,0552,0682,0686,0706,0713,
0717,0719,0723,0724,0777,0787,0792,0804,0865,0893,0911,0933,0941,0980,0982,0990,0994,1008,1012,1014,1017,
1023,1072,1076,1121,1735,1952,2008,2030}'::text[]);
update histoire.events set niveau = 2 where substr(id, 5) = any('{0001,0010,0011,0028,0034,0035,0038,0039,0040,0043,0045,0046,0047,0051,0056,0057,0058,0060,0072,0074,0084,
0086,0087,0088,0089,0096,0098,0103,0105,0106,0107,0109,0112,0119,0124,0128,0130,0131,0134,0135,0136,0139,
0144,0151,0152,0156,0157,0160,0161,0162,0163,0176,0182,0183,0185,0189,0190,0193,0197,0199,0203,0204,0205,
0206,0208,0209,0211,0212,0224,0226,0234,0237,0240,0241,0249,0254,0259,0261,0263,0268,0272,0274,0276,0278,
0281,0282,0283,0284,0290,0291,0296,0300,0301,0303,0304,0305,0306,0308,0311,0312,0313,0315,0316,0319,0321,
0322,0350,0351,0352,0358,0360,0363,0366,0369,0370,0372,0375,0377,0379,0382,0383,0384,0392,0393,0397,0400,
0403,0404,0405,0407,0408,0409,0415,0416,0420,0421,0423,0424,0425,0427,0428,0430,0432,0435,0437,0439,0445,
0449,0451,0452,0453,0454,0456,0457,0458,0459,0460,0461,0462,0463,0465,0467,0468,0469,0470,0474,0475,0476,
0479,0480,0481,0483,0485,0486,0487,0489,0490,0492,0493,0495,0496,0498,0499,0500,0501,0506,0507,0508,0509,
0511,0512,0514,0515,0517,0526,0527,0528,0531,0532,0535,0536,0538,0540,0543,0544,0549,0550,0551,0554,0555,
0558,0559,0560,0561,0562,0565,0567,0577,0578,0579,0580,0581,0583,0588,0589,0591,0593,0596,0597,0598,0613,
0614,0615,0616,0618,0619,0621,0622,0623,0625,0626,0628,0630,0633,0634,0636,0637,0638,0640,0641,0645,0648,
0649,0652,0653,0656,0660,0670,0671,0673,0677,0679,0681,0683,0687,0689,0692,0693,0694,0697,0700,0702,0703,
0704,0710,0711,0712,0715,0716,0718,0720,0721,0722,0730,0740,0741,0743,0746,0749,0751,0754,0757,0759,0760,
0761,0763,0770,0772,0773,0774,0776,0778,0779,0781,0782,0783,0785,0789,0790,0791,0793,0794,0795,0796,0798,
0799,0800,0801,0802,0803,0805,0806,0808,0809,0810,0811,0812,0814,0816,0817,0818,0819,0820,0821,0823,0825,
0826,0829,0831,0836,0840,0842,0846,0848,0850,0851,0853,0854,0855,0856,0858,0859,0861,0862,0863,0870,0871,
0872,0873,0874,0875,0876,0877,0878,0879,0880,0881,0884,0885,0888,0889,0890,0891,0892,0894,0900,0901,0902,
0903,0904,0906,0907,0908,0909,0912,0913,0914,0915,0916,0918,0919,0921,0922,0923,0924,0926,0928,0929,0932,
0935,0937,0939,0943,0945,0951,0959,0961,0963,0970,0971,0972,0979,0981,0984,0986,0988,0989,0992,0998,0999,
1002,1004,1009,1010,1013,1016,1018,1020,1024,1026,1028,1030,1036,1038,1041,1049,1053,1067,1073,1078,1082,
1085,1090,1092,1093,1095,1097,1104,1105,1107,1110,1111,1113,1134,1140,1147,1150,1152,1153,1160,1171,1172,
1175,1338,1409,1415,1450,1629,1670,1680,1704,1711,1717,1736,1741,1783,1818,1829,1831,1838,1854,1863,1865,
1878,1888,1893,1901,1902,1922,1944,1946,1954,1959,1997,2002,2009,2016}'::text[]);

-- Titres affichés tels quels, sans masquage : séries (« 41e édition des Championnats de Wimbledon »,
-- le numéro d'édition reste visible) et noms consacrés (« Appel du 18 juin », « Apollo 11 »).
update histoire.events set titre_question = title
where title ~ '^[0-9]+(e|re|er) (édition|cérémonie|élection|saison|Concours)'
  or substr(id, 5) = any('{0014,0288,0289,0446,0484,0574,0844,0893,0899,0912,0969,0980,1008,1017,1019,1025,1129,1222,1237,1303,1638,1717,1864,1900,1910}'::text[]);
-- Titres qui citaient une date ou un nombre : réécrits pour la question.
update histoire.events e set titre_question = v.titre
from (values
  ('EVT-0002', 'Le 14 Juillet devient la fête nationale française'),
  ('EVT-0004', 'Loi Ferry : instruction primaire obligatoire et laïcisation de l’enseignement public'),
  ('EVT-0006', 'Ordonnance accordant aux femmes le droit de vote et d’éligibilité en France'),
  ('EVT-0064', 'Diffusion des thèses de Martin Luther contre les indulgences'),
  ('EVT-0079', 'Loi de Bonaparte rétablissant l’esclavage dans les colonies'),
  ('EVT-0131', 'Loi abaissant à 18 ans la majorité civile en France'),
  ('EVT-0136', '« Moment Périclès » : l’apogée d’Athènes'),
  ('EVT-0174', 'Nuit du 4 août : abolition des privilèges'),
  ('EVT-0178', 'Procès et condamnation à mort de Louis XVI par la Convention'),
  ('EVT-0185', 'Chute de la monarchie de Juillet (révolution de Février)'),
  ('EVT-0201', 'Début de la Commune de Paris'),
  ('EVT-0226', 'Ouverture de l’Exposition universelle de Paris de la tour Eiffel'),
  ('EVT-0227', 'Inauguration de l’Exposition universelle de Paris au tournant du siècle'),
  ('EVT-0244', 'Nuit de cristal : pogrom contre les Juifs d’Allemagne'),
  ('EVT-0248', 'Entrée en vigueur du cessez-le-feu franco-allemand après la débâcle'),
  ('EVT-0267', 'Entrée en vigueur de la Constitution démocratique portugaise'),
  ('EVT-0286', 'Lancement de Spoutnik 1, premier satellite artificiel'),
  ('EVT-0287', 'Premier vol spatial humain, Youri Gagarine (Vostok 1)'),
  ('EVT-0302', 'Début de l’invasion de l’Irak par la coalition menée par les États-Unis'),
  ('EVT-0305', 'Création du Tribunal pénal international pour l’ex-Yougoslavie (TPIY)'),
  ('EVT-0354', 'Révolution russe'),
  ('EVT-0367', 'Ordonnance de Colbert sur les Eaux et Forêts'),
  ('EVT-0407', 'Bataille de Poitiers pendant la guerre de Cent Ans (Jean le Bon capturé)'),
  ('EVT-0454', 'Reform Act britannique élargissant le droit de vote'),
  ('EVT-0455', 'Sanction royale du Slavery Abolition Act britannique'),
  ('EVT-0458', 'Journées de Juin sous la IIe République'),
  ('EVT-0537', 'Mai 68 : révolte étudiante et grève générale en France'),
  ('EVT-0548', 'Entrée en vigueur de l’abolition de l’esclavage dans l’Empire britannique'),
  ('EVT-0732', 'Début de la guerre entre les États-Unis et le Royaume-Uni'),
  ('EVT-0756', 'Krach boursier de Vienne'),
  ('EVT-0784', 'Soulèvement de Wuchang et début de la révolution chinoise'),
  ('EVT-0866', 'Signature des quatre Conventions de Genève d’après-guerre'),
  ('EVT-1031', 'Brevet britannique de Guglielmo Marconi pour la télégraphie sans fil'),
  ('EVT-1144', 'Compromis sur l’esclavage dans les nouveaux territoires des États-Unis'),
  ('EVT-1159', 'Début de la « Grande Dépression » du XIXe siècle après le krach de Vienne'),
  ('EVT-1997', 'Ouverture des Jeux olympiques de Tokyo reportés à cause de la Covid-19'),
  ('EVT-2030', 'Ouverture des Jeux olympiques de Paris')
) as v(id, titre)
where e.id = v.id;

-- 2. Incontournables : on remplace les événements sortants par les entrants, ligne à ligne
-- (pas de suppression), puis on range les positions dans l'ordre chronologique.
-- Le pack de 100 contient le pack de 50 plus les 50 numéros de la seconde liste.
with incontournables(pack_id, event_id) as (
select 'COL-0059'::text as pack_id, 'EVT-' || x as event_id
from unnest('{0386,0044,0398,0413,0062,0063,0065,0434,0173,0175,0179,0180,0682,0448,0719,0477,0723,0724,0777,0005,0787,0478,0484,0091,0494,0497,0097,0014,0510,0017,0100,0101,0520,0113,0534,0893,0132,0133,0545,0114,0115,0941,0980,0982,0990,1008,1012,1014,1017,1023}'::text[]) x
union all
select 'COL-0060', 'EVT-' || x
from unnest('{0386,0044,0398,0413,0062,0063,0065,0434,0173,0175,0179,0180,0682,0448,0719,0477,0723,0724,0777,0005,0787,0478,0484,0091,0494,0497,0097,0014,0510,0017,0100,0101,0520,0113,0534,0893,0132,0133,0545,0114,0115,0941,0980,0982,0990,1008,1012,1014,1017,1023,
0024,0401,0411,0414,0064,0422,0076,0077,0433,0446,0686,0188,0706,0471,0473,0201,0713,0717,0083,0092,0804,0504,0505,0099,0518,0357,0521,0522,0298,0865,0524,0525,0530,0118,0286,0362,0287,0120,0539,0911,0364,0546,0547,0271,0933,1735,0994,0320,2008,2030}'::text[]) x
), sortants as (
  select pe.pack_id, pe.event_id, row_number() over (partition by pe.pack_id order by pe.event_id) as rang
  from histoire.pack_events pe
  where pe.pack_id in ('COL-0059', 'COL-0060')
    and not exists (select 1 from incontournables v where v.pack_id = pe.pack_id and v.event_id = pe.event_id)
), entrants as (
  select v.pack_id, v.event_id, row_number() over (partition by v.pack_id order by v.event_id) as rang
  from incontournables v
  where not exists (select 1 from histoire.pack_events pe where pe.pack_id = v.pack_id and pe.event_id = v.event_id)
)
update histoire.pack_events pe set event_id = n.event_id
from sortants s join entrants n on n.pack_id = s.pack_id and n.rang = s.rang
where pe.pack_id = s.pack_id and pe.event_id = s.event_id;

update histoire.pack_events pe set position = r.rang
from (
  select pe.pack_id, pe.event_id, row_number() over (partition by pe.pack_id
    order by a.start_year, a.start_month nulls first, a.start_day nulls first, pe.event_id) as rang
  from histoire.pack_events pe join histoire.event_answers a on a.event_id = pe.event_id
  where pe.pack_id in ('COL-0059', 'COL-0060')
) r
where pe.pack_id = r.pack_id and pe.event_id = r.event_id;

update histoire.packs set description = 'Les 50 dates que tout le monde connaît, de l’Antiquité à nos jours.' where id = 'COL-0059';
update histoire.packs set description = 'Les 100 dates de culture générale à connaître, dont les 50 incontournables.' where id = 'COL-0060';

-- 3. start_game avec niveau : nouvelle signature (p_niveau obligatoire, en premier car sans valeur par défaut), l'ancienne reste pour le site en ligne
-- et le mode scolaire. Même corps, plus le filtre « niveau de l'événement <= niveau choisi ».
create function histoire.start_game(
  p_niveau integer,
  p_token text default null,
  p_pack_id text default null,
  p_tag_id text default null,
  p_year_min integer default null,
  p_year_max integer default null,
  p_level_id text default null,
  p_chapter_ids text[] default null,
  p_difficulty text default 'YEAR',
  p_question_count integer default 10,
  p_direction text default 'date'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games;
  picked jsonb;
  player_id uuid := auth.uid();
begin
  if p_niveau is null or p_niveau not between 1 and 3
    or p_direction is null or p_direction not in ('date', 'inverse')
    or p_difficulty is null or p_difficulty not in ('YEAR', 'MONTH', 'DAY')
    or p_question_count is null or p_question_count not between 1 and 100
    or p_year_min = 0 or p_year_max = 0 or p_year_min > p_year_max
    or (player_id is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$'))
    or (p_tag_id is not null and not exists (
      select 1 from histoire.tags where id = p_tag_id and active and tag_type <> 'CENTURY'))
  then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;

  with candidates as (
    select e.id, e.title, e.image_path, a.start_year, a.start_month, a.start_day, a.description,
      row_number() over (
      partition by
        case when p_direction = 'date' then e.id end,
        a.start_year,
        case when p_direction = 'inverse' and p_difficulty in ('MONTH','DAY') then a.start_month end,
        case when p_direction = 'inverse' and p_difficulty = 'DAY' then a.start_day end
      order by random()
    ) as date_rank
    from histoire.events e join histoire.event_answers a on a.event_id = e.id
    where e.playable and a.start_year is not null
      and e.niveau <= p_niveau
      and e.playable_mode in ('YEAR', 'MONTH', 'DAY', 'RANGE')
      and (p_difficulty = 'YEAR' or a.start_month is not null)
      and (p_difficulty <> 'DAY' or a.start_day is not null)
      and (p_year_min is null or a.start_year >= p_year_min)
      and (p_year_max is null or a.start_year <= p_year_max)
      and (p_pack_id is null or exists (
        select 1 from histoire.pack_events pe join histoire.packs p on p.id = pe.pack_id
        where pe.event_id = e.id and p.id = p_pack_id and p.active))
      and (p_tag_id is null or exists (
        select 1 from histoire.event_tags et where et.event_id = e.id and et.tag_id = p_tag_id))
      and (p_level_id is null or exists (
        select 1 from histoire.event_levels el where el.event_id = e.id and el.level_id = p_level_id))
      and (p_chapter_ids is null or exists (
        select 1 from histoire.event_chapters ec join histoire.chapters c on c.id = ec.chapter_id
        where ec.event_id = e.id and ec.chapter_id = any(p_chapter_ids)
          and (p_level_id is null or c.level_id = p_level_id)))
  )
  -- Tirage et instantané dans la même lecture : un import concurrent ne peut
  -- remplacer les dates entre la déduplication et l'enregistrement des questions.
  select jsonb_agg(to_jsonb(selected)) into picked from (
    select * from candidates where date_rank = 1 order by random() limit p_question_count
  ) selected;
  if coalesce(jsonb_array_length(picked), 0) < p_question_count then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  -- Le trigger #13 conserve purge, plafond global et expiration 24 h des anonymes.
  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count, direction, context)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, p_question_count, p_direction,
    jsonb_build_object(
      'mode', case when p_level_id is not null or cardinality(p_chapter_ids) > 0 then 'solo_scolaire' else 'solo_libre' end,
      'niveau', p_niveau,
      'level', (select name from histoire.levels where id = p_level_id),
      'pack', (select jsonb_build_object('key', id, 'label', title) from histoire.packs where id = p_pack_id),
      'theme', (select jsonb_build_object('key', id, 'label', name) from histoire.tags where id = p_tag_id),
      'chapters', coalesce((select jsonb_agg(jsonb_build_object('key', c.id, 'label', c.title, 'level', l.name) order by c.id)
        from histoire.chapters c join histoire.levels l on l.id = c.level_id
        where c.id = any(p_chapter_ids) and (p_level_id is null or c.level_id = p_level_id)), '[]'::jsonb)
    )) returning * into g;
  insert into histoire.game_questions(game_id, event_id, position, difficulty, title, image_path,
    expected_year, expected_month, expected_day, correction_description)
  select g.id, chosen.event->>'id', chosen.position, p_difficulty,
    chosen.event->>'title', chosen.event->>'image_path',
    (chosen.event->>'start_year')::integer, (chosen.event->>'start_month')::integer,
    (chosen.event->>'start_day')::integer, chosen.event->>'description'
  from jsonb_array_elements(picked) with ordinality chosen(event, position);
  return jsonb_build_object('game_id', g.id, 'question_count', g.question_count,
    'difficulty', g.difficulty, 'direction', g.direction, 'state', g.state, 'anonymous', player_id is null);
end;
$$;
revoke all on function histoire.start_game(integer, text, text, text, integer, integer, text, text[], text, integer, text)
  from public, anon, authenticated;
grant execute on function histoire.start_game(integer, text, text, text, integer, integer, text, text[], text, integer, text)
  to anon, authenticated;

-- 4. Titre de la question : le titre rédigé quand il existe.
create or replace function histoire.next_question(p_game_id uuid, p_token text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  q histoire.game_questions;
  duration numeric;
  server_time timestamptz;
  payload jsonb;
begin
  if g.state = 'finished' then return null; end if;
  select * into q from histoire.game_questions
    where game_id = g.id and answered_at is null order by position limit 1;
  if not found then return null; end if;
  if q.asked_at is null then
    select timer_seconds into strict duration from histoire.scoring_settings;
    server_time := clock_timestamp();
    update histoire.game_questions set asked_at = server_time, timer_seconds = duration,
      deadline = server_time + duration * interval '1 second'
    where id = q.id returning * into q;
  end if;
  payload := jsonb_build_object('question_id', q.id, 'position', q.position,
    'difficulty', q.difficulty, 'asked_at', q.asked_at, 'deadline', q.deadline,
    'server_time', clock_timestamp());
  if g.direction = 'inverse' then
    -- Aucune illustration autorisée explicitement dans le PRD inverse.
    return payload || histoire.question_date(q.expected_year, q.expected_month, q.expected_day, q.difficulty);
  end if;
  return payload || jsonb_build_object(
    -- Titre rédigé pour la question quand il existe ; sinon chiffres, mois et siècles masqués.
    'title', coalesce((select e.titre_question from histoire.events e where e.id = q.event_id),
      trim(regexp_replace(regexp_replace(q.title, '[0-9]+', '…', 'g'),
      '\m(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|[IVXLCDM]+e?\s+siècle)\M', '…', 'gi'))),
    'image_path', case when q.image_path = q.event_id || '.svg' then q.image_path end);
end;
$$;
revoke all on function histoire.next_question(uuid, text) from public, anon, authenticated;
grant execute on function histoire.next_question(uuid, text) to anon, authenticated;

insert into histoire.migrations_appliquees (version, nom) values ('20261009180000', 'niveaux_evenements');
