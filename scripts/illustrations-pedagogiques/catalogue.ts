// Choix éditoriaux explicites : chaque scène représente le propos de la carte canonique.
// Les numéros ne servent qu'à l'atelier ; ils ne figurent jamais dans le SVG livré.
export type Scene = { event: string; objets: string[]; intention: string; vigilance: string };
const choix = `
0001|bonnet,laurier|Une République commémorée|Emblème, sans inventer un monument du centenaire.
0002|bonnet,citoyens|Une fête nationale républicaine|Pas de feux d'artifice modernes.
0004|ecole,ouvert|L'instruction devient obligatoire|École générique, sans enseigne.
0005|parchemin,eglise|La séparation des Églises et de l'État|La loi ne supprime pas la liberté de culte.
0009|machine,roue|Les machines transforment le travail|Mécanisme schématique, pas un modèle breveté.
0010|usine,train|Industrie et transports en France|Silhouettes du XIXe siècle.
0011|ville,usine|L'essor des villes industrielles|Bâtiments bas ; aucun gratte-ciel.
0015|famille,barreaux|Des familles arrêtées lors de la rafle|Représentation retenue, sans spectacle de violence.
0022|lyre,rouleau|La transmission des poèmes homériques|La lyre évoque le récit oral ; pas de portrait d'Homère.
0024|louve,colonne|Le récit légendaire de la fondation de Rome|La louve représente un mythe, pas une preuve historique.
0026|rouleau,menorah|Des textes et une tradition religieuse|Sept branches ; pas de caractères hébraïques.
0027|baluchon,ziggurat|L'exil à Babylone|La valise est un signe de déplacement, pas un bagage antique reconstitué.
0028|porte-ouverte,rouleau|Le retour d'exil et les traditions|Pas de restitution certaine du Temple.
0029|temple,assemblee|La cité d'Athènes au temps de Périclès|Architecture grecque générique, pas un portrait.
0031|laurier,colonne|Le pouvoir impérial d'Auguste|Pas de couronne médiévale.
0033|navire,colonne|La circulation dans le monde romain|Voile générique ; pas de vapeur.
0034|parchemin,colonne|La citoyenneté romaine élargie|Pas d'urne contemporaine dans l'Antiquité.
0036|temple,epee|La révolte de Judée et la destruction du Temple|Temple symbolique ; aucune ruine reconstituée comme certaine.
0037|assemblee,croix|Le concile de Nicée|Un débat religieux, sans portrait de Constantin.
0038|laurier,croix|Constantin et le christianisme|Pas d'assimilation à la religion d'État de 380.
0039|parchemin,croix|Le christianisme devient religion impériale|Document symbolique sans lettres.
0041|pagode,rouleau|Le pouvoir et l'administration des Han|Pagode comme convention du stock, pas restitution d'un palais Han.
0045|eglise,croix|Deux chrétientés qui se séparent|La croix reste un signe commun, pas une frontière territoriale.
0046|coupole,epee|Le sac de Constantinople par les croisés|Pas de minaret ottoman en 1204.
0047|coupole,parchemin|Justinien et le gouvernement de l'Empire|Bâtiment byzantin générique.
0048|couronne,parchemin|Le partage de l'Empire à Verdun|Pas de frontières nationales actuelles.
0049|donjon,croix|La prise de Jérusalem par les croisés|Pas de scène de massacre ni de monument inventé.
0051|minaret,epee|Bagdad prise par les Mongols|Architecture générique, sans détail affirmé de 1258.
0052|couronne,donjon|Le début de la dynastie capétienne|Pas de portrait de Hugues Capet.
0054|epee,couronne|Bouvines et le pouvoir royal|Épées médiévales, pas de canon.
0055|donjon,epee|La guerre de Cent Ans|Un conflit médiéval, pas une bataille unique.
0056|canon,donjon|L'artillerie à Castillon|Canon ancien à roues, pas un obusier du XXe siècle.
0057|donjon,couronne|Philippe Auguste renforce son pouvoir|Architecture générique, pas une restitution du Louvre.
0059|couronne,croix|Louis IX devient saint Louis|Canonisation, pas confusion avec le sacre.
0060|assemblee,couronne|Les États généraux réunissent des représentants|Pas d'urne de suffrage universel.
0061|maison,bougie|La peste bouleverse les sociétés|Aucun masque de médecin à bec, anachronique pour 1348.
0066|couronne,palais|Louis XIV exerce le pouvoir personnel|Pas de portrait ni de soleil décoratif supplémentaire.
0069|navire,boussole|Le départ de l'expédition de Magellan|Pas de paquebot.
0070|navire,globe|Elcano achève le voyage|Pas de portrait attribué à Magellan au retour.
0072|assemblee,eglise|Le concile de Trente|Architecture religieuse générique.
0073|epee,croix|Les guerres de Religion|Ni caricature des croyants ni spectacle de massacre.
0078|chaine-rompue,bonnet|La première abolition de l'esclavage|L'abolition de 1794 n'est pas présentée comme définitive.
0079|chaine,bicorne|Le retour à l'ordre esclavagiste sous Bonaparte|Pas de justification du rétablissement de l'esclavage.
0082|balance,barreaux|L'injustice subie par Dreyfus|Pas de visage inventé ou d'insigne militaire précis.
0083|journal,plume|Zola intervient dans la presse|Aucun titre ni lettre dans le dessin.
0084|balance,porte-ouverte|La réhabilitation de Dreyfus|Image de justice, pas de récit d'une simple amnistie.
0086|femme,ouvert|Une femme accède au baccalauréat|Pas de diplôme avec du texte.
0088|femme,monnaie|Les femmes disposent de leur salaire|Pas de symbole monétaire typographique.
0089|kepi,barbeles|L'entrée dans la Grande Guerre|Képi du début du conflit ; fils évoquant la guerre de position, pas une scène exacte d'août 1914.
0090|valise,bougie|La mémoire du génocide des Arméniens|Symboles sobres, aucune scène de violence.
0094|parchemin,usine|Les accords de Matignon et les droits sociaux|Pas de vacances balnéaires comme seul sens des accords.
0101|casque,parchemin|La capitulation allemande|Pas de drapeau à croix gammée.
0107|parchemin,chaine|Le régime autoritaire de Vichy|Pas de symbole fasciste décoratif.
0109|maison,ouvert|Le programme du CNR prépare la reconstruction|Ne pas confondre la réunion de 1943 et le programme de 1944.
0110|globe,bouclier|La doctrine Truman et les deux blocs|Pas de carte de frontières de la guerre froide inventée.
0111|transport,colis|Le pont aérien répond au blocus de Berlin|Avion de transport : adaptation spécifique, sans hélice de chasseur.
0113|mur,barbeles|Le mur de Berlin ferme le passage|Aucune scène heureuse de chute du mur.
0120|parchemin,porte-ouverte|Les accords d'Évian ouvrent la sortie de guerre|La signature ne signifie pas la fin immédiate de toutes les violences.
0129|femme,porte-ouverte|L'autonomie juridique des femmes progresse|Pas de représentation d'une libération déjà complète.
0132|femme,balance|La loi Veil et le droit à l'avortement|Pas d'image médicale intrusive.
0133|balance,chaine-rompue|L'abolition de la peine de mort|Pas de guillotine spectaculaire.
0134|parlement,maison|La décentralisation rapproche les décisions|Pas de carte administrative actuelle.
0136|navire,temple|La puissance maritime d'Athènes|Voile simplifiée ; pas de marine à vapeur.
0139|portique,colonne|La fondation de Constantinople|Silhouette de ville impériale, sans présenter Sainte-Sophie de Justinien comme déjà construite.
0140|croix,epee|L'appel à la première croisade|Objet symbolique, sans portrait d'Urbain II.
0141|epee,eglise|La deuxième croisade|Pas de drapeaux nationaux modernes.
0142|navire,monnaie|Les réseaux commerciaux de Venise|Pas de gondole touristique contemporaine.
0143|globe,boussole|Le premier tour du monde maritime|Le globe reste une convention graphique, pas un objet embarqué précis.
0144|ouvert,balance|Le débat de Valladolid|Pas de caricature des peuples autochtones.
0145|canne,chaine|Les plantations reposent sur l'esclavage|La chaîne rend visible la contrainte, pas un commerce neutre.
0147|pinceau,coupole|L'art de Michel-Ange dans une chapelle|Plume adaptée en pinceau ; pas de copie inexacte de la fresque.
0149|ouvert,plume|Érasme et l'humanisme|Sans portrait inventé.
0151|parchemin,sceau|Villers-Cotterêts et l'administration|Pas de lettres ou de faux texte français.
0152|navire,colis|Colbert développe commerce et manufactures|Pas de conteneur maritime du XXe siècle.
0154|palais,soleil|Versailles met en scène la monarchie|Façade schématique, sans restitution architecturale exacte.
0156|barreaux,balance|L'Habeas corpus protège contre l'arbitraire|Pas de confusion avec la suppression de la prison.
0157|parchemin,couronne|Le Bill of Rights encadre la monarchie|La couronne n'est pas brisée : monarchie maintenue.
0160|plume,ouvert|Voltaire combat l'intolérance par l'écrit|Aucun portrait.
0161|parlement,parchemin|Washington et les institutions américaines|Bâtiment institutionnel générique, pas le Capitole de 1787.
0162|lunette,soleil|Galilée observe le ciel|La lunette demeure au centre ; aucune planète dessinée avec photo.
0163|lunette,croix|Galilée condamné pour ses idées|La croix rappelle l'autorité religieuse du tribunal ; pas de cachot fictif.
0164|newcomen,minerai|La machine de Newcomen pompe l'eau des mines|Balancier et pompe, pas locomotive à vapeur.
0165|ouvert,globe|Émilie du Châtelet traduit et explique Newton|Pas de portrait ni de symbole atomique moderne.
0166|ouvert,roue|L'Encyclopédie diffuse des savoirs techniques|Aucune lettre sur les pages.
0167|fourche,monnaie|Les Nu-pieds se révoltent contre l'impôt|Pas de symbole fiscal contemporain.
0168|ville,famille|La pauvreté urbaine|Sans caricature ni misérabilisme.
0169|table,ouvert|Les salons accueillent les échanges intellectuels|Personnages géométriques du stock.
0170|navire,chaine|La prospérité portuaire liée à la traite|Pas de neutralisation de la violence esclavagiste.
0172|femme,barreaux|Madame Roland et l'exclusion des femmes|Pas de visage supposé.
0174|parchemin,balance|L'abolition des privilèges|Balance de justice : la monarchie existe encore en août 1789.
0179|guillotine,couronne-brisee|L'exécution de Louis XVI|Aucune victime ni sang.
0181|table,couronne|Le congrès de Vienne réorganise l'Europe|Pas de frontières inventées.
0183|bougie,epee|Le massacre de Chios|Aucune mise en scène de victimes.
0184|bonnet,ville|Les Trois Glorieuses|Pas de drapeau à couleurs hors palette.
0186|bonnet,parlement|La Deuxième République|Aucune Marianne portraiturée.
0187|urne,citoyens|Le suffrage universel masculin|Le groupe représente des hommes ; les femmes sont encore exclues.
0188|chaine-rompue,parchemin|L'abolition de l'esclavage en 1848|Pas d'effacement des conséquences de l'esclavage.
0192|boulevard,ville|Haussmann transforme Paris|Façades simplifiées, sans métro ni gratte-ciel.
0196|usine,parchemin|Le droit de coalition ouvrière|Pas de fusion avec la légalisation des syndicats en 1884.
0197|parchemin,mur|Le traité de Turin déplace une frontière|Le mur est un signe de limite, pas une fortification construite par le traité.
0200|palais,couronne|L'Empire allemand proclamé à Versailles|Pas de carte de l'Allemagne actuelle.
0201|ville,bonnet|La Commune de Paris|Pas de confusion avec une fête républicaine.
0204|ville,bougie|La Semaine sanglante|Évocation retenue, aucune victime dessinée.
0206|casque,epee|La bataille de Tannenberg|Convention de bataille, sans tranchées françaises.
0207|kepi,barricade|La bataille de la Marne|Scène emblématique, pas restitution précise d'un taxi ou d'un front.
0208|cuirasse,artillerie|Les Dardanelles, une opération maritime|Pas de minicarte du front français.
0212|artillerie,casque|L'offensive Michael|Pas de chars modernes.
0225|usine,bougie|La fusillade de Fourmies|Pas de spectacle des victimes.
0226|tour,roue|L'Exposition universelle de 1889|Tour Eiffel spécifique, sans texte ni éclairage moderne.
0235|parchemin,minaret|Le traité de Sèvres démantèle l'Empire ottoman|Pas de frontières contemporaines dessinées comme celles de 1920.
0240|parchemin,laurier|Le traité de Lausanne|La reconnaissance diplomatique, sans assimiler la République turque à une monarchie.
0243|usine,parlement|Le New Deal mobilise l'État|Pas de logo ni de drapeau inventé.
0244|bougie,menorah|Les pogroms de novembre 1938|Aucune caricature, pas de scène d'incendie spectaculaire.
0250|casque,pagode|La guerre d'Indochine|Pas de drapeau vietnamien anachronique.
0251|artillerie,casque|La bataille de Diên Biên Phu|Carte de théâtre, pas un tracé de positions militaires.
0253|table,parchemin|Les accords de Genève|Pas de signature attribuée à une personne.
0254|mur,pagode|La division du Vietnam|Le mur est une convention de séparation, pas un mur réellement construit au 17e parallèle.
0255|parchemin,casque|Le cessez-le-feu au Vietnam|Ne pas confondre cessez-le-feu et réunification de 1975.
0257|tunnel,rails|La jonction ferroviaire sous la Manche|Pas de confusion avec la jonction des tunnels en 1990.
0259|tunnel,ciseaux|L'inauguration du tunnel sous la Manche|Ciseaux de cérémonie sans ruban multicolore.
0260|tunnel,colis|Le fret franchit la Manche|Colis génériques, sans logo commercial.
0261|train-moderne,tunnel|L'Eurostar relie les deux rives|Silhouette sans marque ni livrée hors palette.
0262|ouvert,porte-ouverte|Benjamin Constant défend les libertés|Pas de portrait.
0263|ouvert,assemblee|Tocqueville interroge le pouvoir de la majorité|Pas de vote caricatural.
0265|char,parlement|Le coup d'État au Chili|Pas de flamme ni de scène de bombardement spectaculaire.
0267|parchemin,urne|La Constitution portugaise démocratique|Pas de confusion avec la révolution de 1974.
0268|couronne,urne|La Constitution espagnole démocratique|La monarchie parlementaire est maintenue.
0273|table,globe|La conférence de Berlin organise le partage colonial|Le globe n'invente aucune frontière africaine.
0275|char,mur|La guerre de Corée|Aucune carte moderne présentée comme un front.
0276|parchemin,barbeles|L'armistice coréen et la ligne de séparation|Armistice, pas traité de paix.
0277|parchemin,mur-brise|Un traité reconnaît la frontière germano-polonaise|Pas de frontière actuelle dessinée hors contexte.
0278|parchemin,poisson|Montego Bay et le droit de la mer|Pas de carte de ZEE inventée.
0280|parchemin,valise|L'accord de Schengen prépare la libre circulation|Pas de confusion avec l'application de 1995.
0282|valise,porte-ouverte|Schengen permet de franchir certaines frontières|Pas de disparition de toutes les frontières européennes.
0283|journal,documents|Havas organise la circulation de l'information|Pas de télégraphe pour la fondation de 1835.
0284|journal,radio|L'AFP naît à la Libération|Objets d'information, sans logo.
0285|journal,balance|Le statut de l'AFP garantit son indépendance|Pas de badge commercial.
0293|parchemin,recifs|L'accord BBNJ protège la haute mer|Pas de carte d'aires protégées déjà décidées.
0294|poisson,bouclier|L'accord BBNJ entre en application|Protection symbolique, pas de résultat écologique prétendu.
0295|parchemin,epee|Westphalie organise une paix négociée|Le traité n'abolit pas toute guerre.
0296|table,laurier|Kofi Annan et la coopération à l'ONU|Aucun portrait inventé ni logo officiel.
0297|maison,laurier|Construire une paix durable|Reconstruction civile, sans victoire militaire triomphale.
0299|char,petrole|L'invasion du Koweït|Pas de carte territoriale dessinée sans source.
0300|reacteur,char|La coalition de la guerre du Golfe|Avion à réaction adapté, sans marque ni bombardement spectaculaire.
0302|char,maison|La guerre en Irak en 2003|Maison civile générique ; pas de monument attribué à Bagdad.
0303|famille,bougie|La mémoire du génocide des Tutsis|Sans corps ni stéréotype ethnique.
0304|bougie,laurier|La commémoration du génocide au Rwanda|Aucune scène de violence.
0305|balance,parlement|La création du TPIY|Justice internationale, sans façade attribuée à un tribunal précis.
0306|balance,parchemin|L'achèvement des travaux du TPIY|Pas de confusion avec la disparition de tout mécanisme de justice.
0307|documents,balance|Les preuves au procès de Nuremberg|Pas de symboles nazis décoratifs.
0308|balance,barreaux,documents|Le jugement de Nuremberg|Pas de représentation d'une exécution.
0309|mausolee,epee|La destruction du patrimoine à Tombouctou|Mausolée bas en terre, pas de pagode ni de cathédrale.
0310|balance,mausolee|Le jugement d'Al-Mahdi protège le patrimoine|Le monument est symbolique, sans restauration prétendue.
0311|chevalement,usine|Le bassin minier devient patrimoine|Chevalement et terril, pas de tour pétrolière.
0312|repas,table|Le repas gastronomique comme pratique sociale|Repas collectif, pas publicité pour un plat.
0313|geyser,arbres|Yellowstone devient parc national|Geyser et paysage simplifiés.
0314|arbres,bouclier|Le National Park Service protège les parcs|Sans logo officiel ni uniforme moderne.
0315|usine,feuille|L'EPA et la lutte contre les pollutions|Pas de verdure effaçant toute pollution.
0316|table,feuille|Stockholm rassemble les États sur l'environnement|Pas de globe numérique.
0317|globe,feuille|Rio et le développement durable|Pas de pictogramme recyclage moderne.
0318|thermometre,parchemin|Kyoto engage les États sur le climat|Pas de courbe de température inventée.
0322|plaque-photo,minerai|Becquerel observe le rayonnement de l'uranium|La croix est celle de l'expérience photographique, pas un signe religieux.
0325|creuset,minerai|La recherche collective sur le radium|Pas de fluorescence verte ni de symbole radioactif moderne.
0326|ordinateur,bouclier|L'ANSSI protège les systèmes d'information|Objets actuels traités avec les mêmes aplats, sans néon.
0341|tablette,ble|L'écriture enregistre des activités|Traits abstraits, pas de faux texte cunéiforme.
0342|ziggurat,tablette|Les premiers États organisent des villes|Pas de palais moderne.
0345|usine,maison|Le paternalisme au Creusot|La maison montre l'encadrement social, pas seulement le progrès industriel.
0364|urne,parlement|L'alternance politique de 1981|Pas de portrait de Mitterrand.
0366|minaret,parchemin|L'abolition du califat en Turquie|L'abolition d'une institution ne supprime pas la pratique religieuse.
0369|stele,balance|Hammurabi et le droit écrit|Stèle symbolique, pas traduction de signes.
0372|assemblee,colonne|Clisthène réorganise la cité|Pas de suffrage universel contemporain.
0399|eglise,epee|L'appel d'Urbain II|Même convention que les autres cartes de croisade, sans portrait.
0400|epee,coupole|Manzikert et le recul byzantin|Pas de minaret ottoman ni de drapeau turc moderne.
0402|eglise,parchemin|Le concile du Latran organise l'Église|Sans fausse citation.
0403|cavalier,epee|L'Empire mongol s'étend|Pas de représentation caricaturale des Mongols.
0408|fourche,donjon|La Jacquerie conteste les seigneurs|Pas de guillotine anachronique.
0427|couronne,parlement|Le conflit entre roi et Parlement en Angleterre|Aucune monarchie française substituée au contexte.
0428|hache,couronne-brisee|L'exécution de Charles Ier|Hache, pas guillotine anachronique ; aucune victime.
0432|ouvert,citoyens|Rousseau et la souveraineté du peuple|Pas de portrait.
0439|canne,chaine-rompue|L'insurrection de Saint-Domingue|La rupture de chaîne évoque la lutte, pas une liberté déjà acquise.
0442|bonnet,couronne-brisee|La proclamation de la République|La chute de la monarchie est le sujet.
0447|chaine-rompue,laurier|Haïti devient indépendante|Pas de drapeau moderne simplifié arbitrairement.
0457|famille,pommes-terre|La famine irlandaise|Blé remplacé par tubercules : maladie de la pomme de terre, pas du blé.
0458|ville,barricade|Les journées de Juin|Barbelés remplacés par barricade : pas de fil barbelé en 1848.
0459|bicorne,barreaux|Le coup d'État de Louis-Napoléon Bonaparte|Bicorne militaire ; pas de sacre le 2 décembre 1851.
0460|couronne,usine|Le Second Empire et ses transformations|Pas de portrait impérial.
0463|epee,temple|La révolte des Cipayes|Architecture indienne générique ; pas de caricature.
0465|couronne,parchemin,laurier|L'unification italienne|Pas de frontière actuelle imposée à 1861.
0469|citoyens,roue|L'Internationale rassemble des travailleurs|Sans emblème politique ajouté.
0472|canon,couronne|La guerre franco-prussienne|Artillerie du XIXe siècle.
0475|navire,donjon|La crise de Fachoda|Pas de frontière tracée sans source.
0476|citoyens,parchemin|La légalisation des syndicats|Pas de logo syndical actuel.
0482|casque-adrian,barbeles|Verdun et la guerre d'usure|Convention de tranchées du stock validé.
0484|citoyens,usine|Les bolcheviks prennent le pouvoir|Pas de logo communiste décoratif ni de portrait de Lénine.
0494|monnaie,usine|La crise de 1929 et ses effets|Pas de fausse courbe boursière.
0499|parlement,chaine|Les pleins pouvoirs mettent fin aux libertés|Pas de croix gammée.
0501|parchemin,menorah|Les lois de Nuremberg excluent les Juifs|Ne pas suggérer un consentement des victimes ; pas de symbole nazi.
0502|epee,ville|La guerre civile espagnole|Pas de drapeau inventé.
0504|table,casque|Les accords de Munich et la guerre évitée provisoirement|Ne pas présenter Munich comme une paix durable.
0518|barreaux,porte-ouverte|La libération d'Auschwitz|Porte ouverte et clôture, sans image de corps ni inscription.
0522|valise,temple|L'indépendance et la partition de l'Inde|Le bagage évoque les déplacements, sans caricature religieuse.
0533|missile,globe|La crise des missiles de Cuba|Missile sans explosion ; pas de carte du monde polarisée inventée.
0541|pagode,usine|Les réformes économiques chinoises|Pas de gratte-ciel contemporain attribué à 1978.
0542|minaret,citoyens|La révolution iranienne|Pas de portrait ni de symbole sectaire.
0546|char,citoyens|La répression à Tiananmen|Évocation sobre, sans corps ni reconstruction photographique.
0862|valise,minaret|La naissance du Pakistan|La séparation provoque des déplacements ; pas de frontière actuelle inventée.
0905|petrole,monnaie|Le choc pétrolier|Barils et coût, aucun symbole monétaire textuel.
0943|reseau,ordinateur|Google et la puissance des plateformes|Sans logo ; appareil actuel dessiné comme les objets du stock.
1004|char,mur,parchemin|L'annexion de la Crimée|Image de contrainte territoriale ; pas de carte légitimant l'annexion.
1028|parlement,bouclier|Poutine et le pouvoir d'État|Pas de portrait ni d'emblème officiel inventé.
2042|village-neolithique,ble|Çatalhöyük et l'habitat néolithique|Maisons contiguës, accès par le toit ; pas de rue ni de porte en façade.
`;
export const scenes: Scene[] = choix.trim().split("\n").map(ligne => {
  const [id, formes, intention, vigilance] = ligne.split("|");
  return { event: `EVT-${id}`, objets: formes.split(","), intention, vigilance };
});




