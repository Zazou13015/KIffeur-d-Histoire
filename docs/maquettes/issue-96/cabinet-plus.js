/* A+ : même partie de démonstration que A, aucune donnée réelle et aucune requête. */
(() => {
  const root = document.getElementById('bilan-cabinet-plus');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const demo = [
    { title:'Prise de la Bastille', year:1789, answer:1789, accuracy:100, points:94 },
    { title:'Premiers pas sur la Lune', year:1969, answer:1969, accuracy:100, points:90 },
    { title:'Bataille d’Alésia', year:-52, answer:-50, accuracy:96, points:86 },
    { title:'L’imprimerie de Gutenberg', year:1450, answer:1455, accuracy:90, points:78 },
    { title:'Couronnement de Charlemagne', year:800, answer:807, accuracy:86, points:71 },
    { title:'Chute du mur de Berlin', year:1989, answer:1989, accuracy:100, points:95 },
    { title:'Arrivée de Colomb en Amérique', year:1492, answer:1500, accuracy:84, points:72 },
    { title:'Chute de Constantinople', year:1453, answer:1465, accuracy:76, points:63 },
    { title:'Proclamation de la République', year:1792, answer:1798, accuracy:88, points:77 },
    { title:'Fin de la Seconde Guerre mondiale', year:1945, answer:null, accuracy:0, points:0, expired:true },
  ];
  const inverseAnswers = ['La Bastille','Premiers pas sur la Lune','Bataille de Gergovie','L’imprimerie','Louis XIV','Chute du mur de Berlin','Arrivée de Colomb','Chute de Constantinople','Proclamation de la République',null];
  const inversePoints = [94,90,0,78,0,95,72,73,77,0];
  const format = value => new Intl.NumberFormat('fr-FR').format(value);
  const date = value => value < 0 ? `${Math.abs(value)} av. J.-C.` : String(value);
  const numero = value => String(value + 1).padStart(2,'0');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  // Coordonnée annuelle pour la démonstration seulement, sans année zéro affichée.
  const coord = year => year > 0 ? year - 1 : year;
  const annee = t => t >= 0 ? t + 1 : t;
  const state = { scenario:'classique', selected:2, view:'parcours' };
  let questions=[], inverse=false, total=0, best=0, animation;
  function notice(texte) {
    $('[data-notice]').hidden=false;
    $('[data-notice]').textContent=`Démonstration : ${texte}`;
  }
  function score(animer=false) {
    cancelAnimationFrame(animation);
    $('[data-score]').textContent=format(total);
    $('[data-score-block]').setAttribute('aria-label',`${total} points sur ${questions.length * 100}`);
    if (!animer || matchMedia('(prefers-reduced-motion: reduce)').matches || !root.getClientRects().length) return;
    // La valeur finale reste le nom accessible. Le compteur ne déclenche aucune annonce par frame.
    const start=performance.now();
    const draw=now => {
      const t=Math.min((now-start)/650,1);
      $('[data-score]').textContent=format(Math.round(total*(1-Math.pow(1-t,3))));
      if (t<1) animation=requestAnimationFrame(draw);
    };
    animation=requestAnimationFrame(draw);
  }
  function selection(index) {
    state.selected=index;
    const q=questions[index];
    if (inverse || q.answer===null) state.view='parcours';
    renderDetail();
  }
  function renderDetail() {
    const q=questions[state.selected];
    const status=q.expired ? 'Temps écoulé · aucune réponse' : inverse ? q.accuracy===100 ? '✓ Bonne réponse' : 'À revoir · réponse incorrecte' : q.answer===q.year ? '✓ Date exacte' : `Écart : ${Math.abs(coord(q.answer)-coord(q.year))} ans · ${q.accuracy} % de précision`;
    const reponse=q.answer===null ? 'Aucune réponse' : inverse ? `« ${q.answer} »` : date(q.answer);
    $('[data-detail]').innerHTML=`<div class="answer-heading"><span class="eyebrow">REPÈRE ${numero(state.selected)} · ${inverse ? `DATE DONNÉE : ${date(q.year)}` : 'PRÉCISION ANNÉE'}</span><h3>${escape(q.title)}</h3><p>${escape(status)}</p></div><dl class="answer-date correct"><dt>${inverse ? 'Événement attendu' : 'Date attendue'}</dt><dd class="${inverse ? 'answer-text' : ''}">${escape(inverse ? q.title : date(q.year))}</dd></dl><dl class="answer-date"><dt>Votre réponse</dt><dd class="${inverse || q.answer===null ? 'answer-text' : ''}">${escape(reponse)}</dd></dl><div class="answer-points"><b>${q.points}</b><span>POINTS</span></div>`;
    $('[data-position]').textContent=`QUESTION ${numero(state.selected)} SUR ${questions.length}`;
    $('[data-action="precedente"]').disabled=state.selected===0;
    $('[data-action="suivante"]').disabled=state.selected===questions.length-1;
    for (const button of $('[data-picks]').querySelectorAll('button')) button.setAttribute('aria-pressed',String(Number(button.dataset.question)===state.selected));
    $('[data-view="ecart"]').disabled=inverse || q.answer===null;
    for (const button of root.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed',String(button.dataset.view===state.view));
    renderTimeline();
  }
  function renderTimeline() {
    if (!questions.length) return;
    const container=$('[data-timeline]');
    const width=Math.max(280,container.getBoundingClientRect().width);
    const small=width<600, q=questions[state.selected];
    const height=small ? 164 : 125;
    const focus=state.view==='ecart' && !inverse && q.answer!==null;
    const valeurs=focus ? [q.year,q.answer] : questions.flatMap(item => !inverse && item.answer!==null ? [item.year,item.answer] : [item.year]);
    let min=Math.min(...valeurs.map(coord)), max=Math.max(...valeurs.map(coord));
    if (focus) { const extension=Math.max(4,(max-min)*.55); min-=extension; max+=extension; }
    const pad=small ? 25 : 58;
    const x=year => pad+(coord(year)-min)/Math.max(1,max-min)*(width-2*pad);
    const cy=focus ? (small ? 64 : 54) : (small ? 95 : 68);
    const py=focus ? (small ? 116 : 96) : (small ? 122 : 94);
    let dessin=`<title>${focus ? 'La date attendue et votre réponse, en détail' : 'Le parcours des dix questions de la partie'}</title><desc>Les cercles indiquent les dates attendues, les losanges les réponses du joueur. Les dates proches sont regroupées pour la navigation, sans déplacer leurs positions sur l’axe. ${inverse ? 'Aucune date de réponse du joueur n’est inventée en mode inversé.' : 'Une réponse expirée n’a pas de losange.'}</desc><line class="axis" x1="${pad}" y1="${cy}" x2="${width-pad}" y2="${cy}"/>`;
    const indices=focus ? [state.selected] : questions.map((_,i)=>i);
    indices.forEach(i => {
      const item=questions[i], actif=i===state.selected;
      const cx=x(item.year);
      if (!inverse && item.answer!==null) {
        const px=x(item.answer);
        dessin+=`<line class="connector ${actif ? 'active-connector' : ''}" x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"/><path class="player-mark" d="M${px},${py-4} l4,4 -4,4 -4,-4 Z"/>`;
      }
      dessin+=`<circle class="correct-mark" cx="${cx}" cy="${cy}" r="${actif ? 6 : 3.5}"/>`;
      if (actif) dessin+=`<line class="active-guide" x1="${cx}" y1="${cy+7}" x2="${cx}" y2="${py+15}"/>`;
    });
    if (focus) {
      const cx=x(q.year), px=x(q.answer);
      dessin+=`<text class="selected-date" x="${cx}" y="${cy-23}" text-anchor="middle">${date(q.year)}</text><text class="player-date" x="${px}" y="${py-17}" text-anchor="middle">${date(q.answer)}</text>`;
      const ecart=Math.abs(coord(q.answer)-coord(q.year));
      $('[data-frise-caption]').textContent=ecart===0 ? 'Deux réponses au même repère : une date exacte.' : `Question ${state.selected+1} · ${ecart} ans entre la date attendue et votre réponse.`;
      $('[data-view-caption]').textContent=`VUE RAPPROCHÉE · QUESTION ${numero(state.selected)}`;
      $('[data-hotspots]').innerHTML='';
    } else {
      const ordonnees=questions.map((item,i)=>({i,year:item.year,x:x(item.year)})).sort((a,b)=>a.x-b.x);
      const groupes=[];
      for (const item of ordonnees) {
        const dernier=groupes.at(-1);
        if (dernier && item.x-dernier[0].x<(small ? 95 : 74)) dernier.push(item);
        else groupes.push([item]);
      }
      const etiquette=groupe => {
        const cx=groupe.reduce((sum,item)=>sum+item.x,0)/groupe.length;
        const labelWidth=small ? (groupe.length>1 ? 110 : 80) : 100;
        return {cx,labelWidth,labelX:Math.max(labelWidth/2,Math.min(width-labelWidth/2,cx))};
      };
      // Après le regroupement temporel, fusionner aussi les étiquettes qui se toucheraient.
      // Les dates et leurs marques gardent leur vraie position ; les cibles tactiles ne se recouvrent pas.
      for (let i=1;i<groupes.length;) {
        const gauche=etiquette(groupes[i-1]), droite=etiquette(groupes[i]);
        if (droite.labelX-droite.labelWidth/2-(gauche.labelX+gauche.labelWidth/2)<4) {
          groupes[i-1].push(...groupes[i]); groupes.splice(i,1); i=Math.max(1,i-1);
        } else i++;
      }
      const hotspots=groupes.map(groupe => {
        const actif=groupe.some(item=>item.i===state.selected);
        const {cx,labelWidth,labelX}=etiquette(groupe);
        const first=groupe[0].year, last=groupe.at(-1).year;
        const dates=first===last ? date(first) : `${date(first)} — ${date(last)}`;
        dessin+=`<line class="axis" x1="${labelX}" y1="52" x2="${cx}" y2="${cy-6}"/>`;
        return `<button type="button" data-group="${groupe.map(item=>item.i).join(',')}" style="left:${labelX}px;width:${labelWidth}px" aria-pressed="${actif}" aria-label="${groupe.length===1 ? `Question ${groupe[0].i+1} : ${escape(questions[groupe[0].i].title)}` : `${groupe.length} repères entre ${escape(dates)}. Parcourir les questions ${groupe.map(item=>item.i+1).join(', ')}`}" data-tooltip="${escape(groupe.map(item=>`${item.i+1}. ${questions[item.i].title}`).join(' · '))}"><strong>${groupe.length===1 ? numero(groupe[0].i) : `${groupe.length} repères`}</strong><small>${escape(dates)}</small></button>`;
      });
      $('[data-hotspots]').innerHTML=hotspots.join('');
      const bornes=[annee(min),annee(max)];
      const ticks=small ? bornes : [bornes[0],500,1000,1500,bornes[1]].filter((year,i,list)=>coord(year)>=min && coord(year)<=max && list.indexOf(year)===i);
      ticks.forEach((year,i) => { const tx=x(year); dessin+=`<line class="axis" x1="${tx}" y1="${py+11}" x2="${tx}" y2="${py+16}"/><text x="${tx}" y="${height-4}" text-anchor="${i===0 ? 'start' : i===ticks.length-1 ? 'end' : 'middle'}">${date(year)}</text>`; });
      $('[data-frise-caption]').textContent=q.expired ? 'Temps écoulé : la date attendue reste visible, sans réponse inventée.' : 'Les dates proches sont regroupées. Choisissez un repère pour le revoir.';
      $('[data-view-caption]').textContent=`VUE D’ENSEMBLE · ${date(bornes[0]).toUpperCase()} — ${date(bornes[1])}`;
    }
    container.innerHTML=`<svg role="img" aria-label="${focus ? 'Frise rapprochée de la réponse sélectionnée' : 'Frise chronologique des dix questions'}" viewBox="0 0 ${width} ${height}">${dessin}</svg>`;
    $('[data-legend]').innerHTML=inverse ? '<span>● Date donnée par le jeu</span>' : '<span>● Date attendue</span><span>◇ Votre réponse</span>';
  }
  function render(animer=false) {
    inverse=state.scenario==='inverse';
    const zero=state.scenario==='zero';
    questions=demo.map((q,i)=>({...q,...(inverse ? {answer:inverseAnswers[i],accuracy:inversePoints[i] ? 100 : 0,points:inversePoints[i]} : {}),...(zero ? {answer:q.expired ? null : q.year+80,accuracy:0,points:0} : {})}));
    total=questions.reduce((sum,q)=>sum+q.points,0);
    const precision=Math.round(questions.reduce((sum,q)=>sum+q.accuracy,0)/questions.length);
    const exacts=questions.filter(q=>!q.expired && (inverse ? q.accuracy===100 : q.answer===q.year)).length;
    best=questions.reduce((index,q,i)=>q.points>questions[index].points ? i : index,0);
    $('[data-max]').textContent=format(questions.length*100);
    $('[data-accuracy]').innerHTML=`${precision}<span>%</span>`;
    $('[data-accuracy-label]').innerHTML=inverse ? 'de bonnes<br>réponses' : 'de précision<br>moyenne';
    $('[data-exact-count]').textContent=String(exacts);
    $('[data-exact-label]').innerHTML=`${inverse ? 'bonnes réponses' : 'dates exactes'}<br>sur ${questions.length} questions`;
    $('[data-mode]').textContent=inverse ? 'MODE INVERSÉ · TROUVER L’ÉVÉNEMENT' : state.scenario==='pedagogique' ? 'TEST DE CHAPITRE · PRÉCISION ANNÉE' : 'SOLO LIBRE · PRÉCISION ANNÉE';
    $('[data-appreciation]').textContent=zero ? 'L’Histoire continue.' : 'Une belle traversée.';
    $('[data-intro]').textContent=zero ? 'Chaque date découverte est un nouveau départ.' : state.scenario==='pedagogique' ? 'Révision des repères du chapitre (démonstration).' : 'Dix dates. Une nouvelle page de votre Histoire.';
    $('[data-action="meilleure"]').hidden=zero;
    $('[data-best-title]').textContent=questions[best].title;
    $('[data-best-points]').textContent=`${questions[best].points} pts ↗`;
    $('[data-picks]').innerHTML=questions.map((q,i)=>`<button type="button" data-question="${i}" data-exact="${!q.expired && q.accuracy===100}" data-expired="${Boolean(q.expired)}" aria-pressed="${i===state.selected}" aria-label="Question ${i+1} : ${escape(q.title)}, ${q.points} points${q.expired ? ', temps écoulé' : ''}">${numero(i)}</button>`).join('');
    $('[data-save]').setAttribute('role',state.scenario==='erreur' ? 'alert' : 'status');
    $('[data-save]').innerHTML=state.scenario==='invite' ? 'Partie jouée sans compte. <button data-action="connexion">Se connecter pour la sauvegarder</button>' : state.scenario==='rattachement' ? 'Sauvegarde de la partie en cours…' : state.scenario==='erreur' ? 'Sauvegarde indisponible. <button data-action="reessayer">Réessayer</button>' : '✓ Partie sauvegardée dans votre compte KFFR.';
    $('[data-action="profil"]').textContent=state.scenario==='invite' ? 'Connexion' : 'Antonin · Profil';
    $('[data-action="chapitre"]').hidden=state.scenario!=='pedagogique';
    $('[data-chapter-status]').hidden=state.scenario!=='pedagogique';
    $('[data-chapter-status]').textContent='✓ Progression enregistrée (démo).';
    $('[data-scenario]').value=state.scenario;
    if (inverse || questions[state.selected].answer===null) state.view='parcours';
    score(animer);
    renderDetail();
  }
  root.addEventListener('click',event => {
    const button=event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.question!==undefined) selection(Number(button.dataset.question));
    else if (button.dataset.group!==undefined) {
      const indices=button.dataset.group.split(',').map(Number);
      const actuel=indices.indexOf(state.selected);
      selection(indices[(actuel+1)%indices.length]);
    } else if (button.dataset.view) { state.view=button.dataset.view; renderDetail(); }
    else switch (button.dataset.action) {
      case 'precedente': selection(Math.max(0,state.selected-1)); break;
      case 'suivante': selection(Math.min(questions.length-1,state.selected+1)); break;
      case 'meilleure': selection(best); break;
      case 'rejouer': notice('le même choix serait relancé. Aucune partie créée.'); score(true); break;
      case 'mode': notice('retour au choix du mode. Cette maquette reste ouverte.'); break;
      case 'chapitre': notice('retour à la frise du chapitre. Aucune progression modifiée.'); break;
      case 'connexion': notice('connexion pour rattacher la partie. Aucun accès à l’authentification.'); break;
      case 'reessayer': notice('nouvelle tentative de sauvegarde. Aucune requête envoyée.'); break;
      case 'profil': notice('ouverture du profil ou de la connexion. Aucun accès à un compte.'); break;
    }
  });
  $('[data-scenario]').addEventListener('change',event => {
    state.scenario=event.target.value; state.selected=2; state.view='parcours';
    $('[data-notice]').hidden=true; render(true);
  });
  render(true);
  new ResizeObserver(renderTimeline).observe($('[data-timeline]'));
  if (globalThis.Tweak) {
    const tweak=new Tweak({container:root,onChange:()=>render(false)});
    tweak.addSelect(state,'scenario',{label:'Cas de démonstration',options:[{label:'Partie classique',value:'classique'},{label:'Mode inversé',value:'inverse'},{label:'Score nul',value:'zero'},{label:'Test pédagogique',value:'pedagogique'},{label:'Sans compte',value:'invite'},{label:'Sauvegarde en cours',value:'rattachement'},{label:'Sauvegarde indisponible',value:'erreur'}]});
  }
})();
