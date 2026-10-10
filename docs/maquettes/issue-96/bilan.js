/* Partie fictive et interactions locales uniquement : aucune RPC, aucun accès à un compte. */
(() => {
  const exemple = [
    { title: 'Prise de la Bastille', year: 1789, answer: 1789, accuracy: 100, points: 94 },
    { title: 'Premiers pas sur la Lune', year: 1969, answer: 1969, accuracy: 100, points: 90 },
    { title: 'Bataille d’Alésia', year: -52, answer: -50, accuracy: 96, points: 86 },
    { title: 'L’imprimerie de Gutenberg', year: 1450, answer: 1455, accuracy: 90, points: 78 },
    { title: 'Couronnement de Charlemagne', year: 800, answer: 807, accuracy: 86, points: 71 },
    { title: 'Chute du mur de Berlin', year: 1989, answer: 1989, accuracy: 100, points: 95 },
    { title: 'Arrivée de Colomb en Amérique', year: 1492, answer: 1500, accuracy: 84, points: 72 },
    { title: 'Chute de Constantinople', year: 1453, answer: 1465, accuracy: 76, points: 63 },
    { title: 'Proclamation de la République', year: 1792, answer: 1798, accuracy: 88, points: 77 },
    { title: 'Fin de la Seconde Guerre mondiale', year: 1945, answer: null, accuracy: 0, points: 0, expired: true },
  ];
  const inverseAnswers = ['La Bastille', 'Premiers pas sur la Lune', 'Bataille de Gergovie', 'L’imprimerie', 'Louis XIV', 'Chute du mur de Berlin', 'Arrivée de Colomb', 'Chute de Constantinople', 'Proclamation de la République', null];
  const inversePoints = [94, 90, 0, 78, 0, 95, 72, 73, 77, 0];
  const format = value => new Intl.NumberFormat('fr-FR').format(value);
  const date = value => value < 0 ? `${Math.abs(value)} av. J.-C.` : String(value);
  const numero = value => String(value + 1).padStart(2, '0');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  for (const id of ['bilan-cabinet', 'bilan-immersif']) {
    const root = document.getElementById(id);
    if (!root) continue;
    const $ = selector => root.querySelector(selector);
    const state = { scenario: 'classique', selected: 2 };
    let questions = [], inverse = false, total = 0, best = 0, animation;
    function notice(message) {
      $('[data-notice]').hidden = false;
      $('[data-notice]').textContent = `Démonstration : ${message}`;
    }
    function montrerScore(animer = false) {
      cancelAnimationFrame(animation);
      const target = $('[data-score]');
      target.textContent = format(total);
      $('[data-score-block]').setAttribute('aria-label', `${total} points sur ${questions.length * 100}`);
      if (!animer || root.dataset.bilanPrototype !== 'immersif' || matchMedia('(prefers-reduced-motion: reduce)').matches || !root.getClientRects().length) return;
      const start = performance.now();
      const draw = now => {
        const t = Math.min((now - start) / 850, 1);
        target.textContent = format(Math.round(total * (1 - Math.pow(1 - t, 3))));
        if (t < 1) animation = requestAnimationFrame(draw);
      };
      animation = requestAnimationFrame(draw);
    }
    function renderDetail() {
      const q = questions[state.selected];
      $('[data-position]').textContent = `${numero(state.selected)} / ${questions.length}`;
      $('[data-action="precedente"]').disabled = state.selected === 0;
      $('[data-action="suivante"]').disabled = state.selected === questions.length - 1;
      const status = q.expired ? 'Temps écoulé · aucune réponse' : inverse ? q.accuracy === 100 ? '✓ Bonne réponse' : 'À revoir · réponse incorrecte' : q.answer === null ? 'Aucune réponse' : q.answer === q.year ? '✓ Date exacte' : `Écart : ${Math.abs(q.answer - q.year)} ans`;
      const player = q.expired || q.answer === null ? 'Aucune réponse' : inverse ? `« ${q.answer} »` : date(q.answer);
      $('[data-detail]').innerHTML = `<div class="answer-top"><span class="eyebrow">PIÈCE ${numero(state.selected)} / ${questions.length}</span><span class="answer-points">${q.points} <small>pts</small></span></div><h3 class="answer-title">${escape(q.title)}</h3><dl class="answer-dates"><div><dt>${inverse ? 'Événement attendu' : 'Date attendue'}</dt><dd class="correct-date ${inverse ? 'answer-text' : ''}">${escape(inverse ? q.title : date(q.year))}</dd></div><div><dt>Votre réponse</dt><dd class="${inverse || q.answer === null ? 'answer-text' : ''}">${escape(player)}</dd></div></dl><p class="answer-status"><span>${escape(status)}</span><span>${inverse ? `Date donnée : ${date(q.year)}` : `${q.accuracy} % de précision`}</span></p>`;
      for (const button of $('[data-picks]').querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.question) === state.selected));
      renderTimeline();
    }
    function renderTimeline() {
      const container = $('[data-timeline]');
      const width = Math.max(280, container.getBoundingClientRect().width);
      const small = width < 600;
      const height = root.dataset.bilanPrototype === 'immersif' ? 110 : 90;
      const correctY = root.dataset.bilanPrototype === 'immersif' ? 45 : 28;
      const answerY = correctY + 25;
      // Vue générale à l'année, sans zoom ni moteur de frise recréé. Pas d'année zéro affichée.
      const values = questions.flatMap(q => inverse || q.answer === null ? [q.year] : [q.year, q.answer]);
      const min = Math.min(...values), max = Math.max(...values);
      const pad = 24, x = year => pad + (year - min) / Math.max(1, max - min) * (width - pad * 2);
      const ticks = small ? [min, 1000, max] : [min, 500, 1000, 1500, max];
      let content = `<title>Les dates de cette partie, dans l’ordre chronologique</title><desc>Les cercles indiquent les dates attendues${inverse ? '. En mode inversé, aucune date du joueur n’est inventée.' : ', les losanges les réponses datées du joueur. Une réponse expirée n’a pas de losange.'} Les boutons numérotés permettent d’explorer chaque réponse.</desc><line class="axis" x1="${pad}" y1="${correctY}" x2="${width - pad}" y2="${correctY}"/>`;
      const labels = [];
      questions.forEach((q, i) => {
        const cx = x(q.year), selected = i === state.selected;
        if (!inverse && q.answer !== null) {
          const px = x(q.answer);
          content += `<line class="answer-connector ${selected ? 'selected-link' : ''}" x1="${cx}" y1="${correctY}" x2="${px}" y2="${answerY}"/><path class="player-mark" d="M${px},${answerY - 4} l4,4 -4,4 -4,-4 Z"/>`;
        }
        content += `<circle class="correct-mark ${selected ? 'selected-mark' : ''}" cx="${cx}" cy="${correctY}" r="${selected ? 6 : 3.5}"/>`;
        // Les points conservent leur position réelle. Des repères denses restent sans étiquette
        // pour éviter de feindre un espacement temporel ; ils sont consultables par les boutons.
        if (selected || labels.every(label => Math.abs(cx - label) > 35)) {
          if (!selected && questions.some((other, j) => j === state.selected && Math.abs(cx - x(other.year)) < 30)) return;
          labels.push(cx);
          content += `<text class="timeline-label" x="${cx}" y="${correctY - 16}" text-anchor="middle">${numero(i)}</text>`;
        }
      });
      ticks.forEach((value, i) => {
        const tx = x(value);
        content += `<line class="axis" x1="${tx}" y1="${answerY + 11}" x2="${tx}" y2="${answerY + 16}"/><text x="${tx}" y="${answerY + 31}" text-anchor="${i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}">${date(value)}</text>`;
      });
      container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Frise synthétique des dix questions">${content}</svg>`;
      for (const key of root.querySelectorAll('.timeline-key')) key.innerHTML = inverse ? '<span>● Date donnée par le jeu</span>' : '<span>● Date attendue</span><span>◇ Votre date</span>';
    }
    function render(animer = false) {
      inverse = state.scenario === 'inverse';
      const zero = state.scenario === 'zero';
      questions = exemple.map((q, i) => ({ ...q,
        ...(inverse ? { answer: inverseAnswers[i], accuracy: inversePoints[i] ? 100 : 0, points: inversePoints[i] } : {}),
        ...(zero ? { answer: q.expired ? null : q.year + 80, accuracy: 0, points: 0 } : {}),
      }));
      total = questions.reduce((sum, q) => sum + q.points, 0);
      const accuracy = Math.round(questions.reduce((sum, q) => sum + q.accuracy, 0) / questions.length);
      const exact = questions.filter(q => !q.expired && (inverse ? q.accuracy === 100 : q.answer === q.year)).length;
      best = questions.reduce((index, q, i) => q.points > questions[index].points ? i : index, 0);
      $('[data-max]').textContent = format(questions.length * 100);
      $('[data-accuracy]').innerHTML = `${accuracy}<span>%</span>`;
      $('[data-accuracy-label]').textContent = inverse ? 'de bonnes réponses' : 'de précision moyenne';
      $('[data-summary]').innerHTML = `${exact} ${inverse ? 'bonnes réponses' : 'dates exactes'}<br>sur ${questions.length} questions`;
      $('[data-mode]').textContent = inverse ? 'MODE INVERSÉ · TROUVER L’ÉVÉNEMENT' : state.scenario === 'pedagogique' ? 'TEST DE CHAPITRE · PRÉCISION ANNÉE' : 'SOLO LIBRE · PRÉCISION ANNÉE';
      $('[data-appreciation]').innerHTML = zero ? 'L’Histoire continue.' : root.dataset.bilanPrototype === 'cabinet' ? 'Une belle traversée.' : 'Vous avez le sens<br>de l’Histoire.';
      $('[data-intro]').textContent = state.scenario === 'pedagogique' ? 'Démonstration · Révision : repères de l’Histoire.' : zero ? 'Chaque date découverte est un nouveau départ.' : root.dataset.bilanPrototype === 'cabinet' ? 'Dix dates. Une nouvelle page de votre Histoire.' : 'La partie s’achève. La curiosité continue.';
      const strong = $('[data-action="meilleure"]');
      strong.hidden = zero;
      if (!zero) {
        $('[data-best-position]').textContent = numero(best);
        $('[data-best-title]').textContent = questions[best].title;
        $('[data-best-date]').textContent = `${date(questions[best].year)} · ${inverse ? 'bonne réponse' : 'date exacte'}`;
        $('[data-best-points]').textContent = String(questions[best].points);
      }
      $('[data-picks]').innerHTML = questions.map((q, i) => `<button type="button" data-question="${i}" data-expired="${Boolean(q.expired)}" aria-pressed="${i === state.selected}" aria-label="Question ${i + 1} : ${escape(q.title)}, ${q.points} points${q.expired ? ', temps écoulé' : ''}">${numero(i)}</button>`).join('');
      const save = $('[data-save]');
      save.setAttribute('role', state.scenario === 'erreur' ? 'alert' : 'status');
      save.innerHTML = state.scenario === 'invite' ? 'Partie jouée sans compte. <button data-action="connexion">Se connecter pour la sauvegarder</button>' : state.scenario === 'rattachement' ? 'Sauvegarde de la partie en cours…' : state.scenario === 'erreur' ? 'Sauvegarde indisponible. <button data-action="reessayer">Réessayer</button>' : '✓ Partie sauvegardée dans votre compte KFFR.';
      $('[data-action="profil"]').textContent = state.scenario === 'invite' ? 'Connexion' : 'Antonin · Profil';
      $('[data-action="chapitre"]').hidden = state.scenario !== 'pedagogique';
      $('[data-chapter-status]').hidden = state.scenario !== 'pedagogique';
      $('[data-chapter-status]').textContent = '✓ Résultat ajouté à votre progression de chapitre (démo).';
      $('[data-scenario]').value = state.scenario;
      montrerScore(animer);
      renderDetail();
    }
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.dataset.question !== undefined) { state.selected = Number(button.dataset.question); renderDetail(); }
      else switch (button.dataset.action) {
        case 'precedente': state.selected = Math.max(0, state.selected - 1); renderDetail(); break;
        case 'suivante': state.selected = Math.min(questions.length - 1, state.selected + 1); renderDetail(); break;
        case 'meilleure': state.selected = best; renderDetail(); break;
        case 'rejouer': notice('le même choix serait relancé. Aucune partie créée.'); montrerScore(true); break;
        case 'mode': notice('retour au choix du mode. Cette maquette reste ouverte.'); break;
        case 'chapitre': notice('retour à la frise du chapitre. Aucune progression modifiée.'); break;
        case 'connexion': notice('connexion pour rattacher cette partie au compte. Aucun accès à l’authentification.'); break;
        case 'reessayer': notice('nouvelle tentative de sauvegarde. Aucune requête envoyée.'); break;
        case 'profil': notice('ouverture du profil ou de la connexion. Aucun accès à un compte.'); break;
      }
    });
    $('[data-scenario]').addEventListener('change', event => {
      state.scenario = event.target.value;
      state.selected = 2;
      $('[data-notice]').hidden = true;
      render(true);
    });
    render(true);
    new ResizeObserver(renderTimeline).observe($('[data-timeline]'));
    if (globalThis.Tweak) {
      const tweak = new Tweak({ container: root, onChange: () => render(false) });
      tweak.addSelect(state, 'scenario', { label: 'Cas de démonstration', options: [
        { label: 'Partie classique', value: 'classique' }, { label: 'Mode inversé', value: 'inverse' },
        { label: 'Score nul', value: 'zero' }, { label: 'Test pédagogique', value: 'pedagogique' },
        { label: 'Sans compte', value: 'invite' }, { label: 'Sauvegarde en cours', value: 'rattachement' },
        { label: 'Sauvegarde indisponible', value: 'erreur' },
      ] });
    }
  }
})();
