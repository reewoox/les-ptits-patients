// Les P'tits Patients — petits scripts du site (aucune donnée envoyée, aucun cookie).
(function () {
  'use strict';

  // mémoire locale, facultative (navigation privée, stockage bloqué : tout marche quand même)
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('pp:' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('pp:' + k, JSON.stringify(v)); } catch (e) { /* rien */ } }
  };
  window.ppStore = store;
  var each = function (sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); };

  function confetti(n) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    var cols = ['#FFC93C', '#FF8FAB', '#4D96FF', '#06D6A0', '#9B5DE5', '#FF7B54'];
    for (var i = 0; i < (n || 90); i++) {
      var c = document.createElement('i');
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      box.appendChild(c);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4500);
  }
  window.ppConfetti = confetti;

  // typographie française : espaces insécables avant ! ? ; : et dans les guillemets (textes écrits par le script)
  function frTypo(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue;
      var u = t.replace(/ ([!?;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
      if (u !== t) n.nodeValue = u;
    }
  }

  // ---------------- LECTURE À VOIX HAUTE ----------------
  // Uniquement avec une voix française installée sur l'appareil (localService) : aucun texte ne part sur Internet.
  var voice = null;
  var synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  function pickVoice() {
    var vs = synth.getVoices() || [], best = null;
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i];
      if (!/^fr/i.test(v.lang) || v.localService !== true) continue;
      if (!best || (/fr[-_]FR/i.test(v.lang) && !/fr[-_]FR/i.test(best.lang))) best = v;
    }
    voice = best;
    each('.speak, .tool-lecteur', function (b) { b.hidden = !voice; });
  }
  function speak(text) {
    if (!voice) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.92;
    synth.speak(u);
  }
  function hush() { if (synth) synth.cancel(); }
  var SPEAKER = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>' +
    '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function speakBtn(label, getText) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'speak';
    b.hidden = !voice;
    b.setAttribute('aria-label', label);
    b.innerHTML = SPEAKER + '<span>Écouter</span>';
    b.addEventListener('click', function () { speak(getText()); });
    return b;
  }

  // ---------------- SONS : fabriqués par le navigateur (aucun fichier, aucun service extérieur) ----------------
  var sfx = (function () {
    var ctx = null;
    function enabled() { return store.get('son') !== false; }
    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return ctx;
    }
    function tone(f, t0, dur, type, vol, f2) {
      var c = ac();
      if (!c) return;
      var t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.14, t + Math.min(0.03, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    var S = {
      good: function () { tone(784, 0, 0.14, 'sine', 0.13); tone(1175, 0.09, 0.24, 'sine', 0.11); },
      bad: function () { tone(220, 0, 0.2, 'triangle', 0.12); tone(175, 0.12, 0.26, 'triangle', 0.1); },
      flip: function () { tone(700, 0, 0.05, 'triangle', 0.05); },
      pop: function () { tone(523, 0, 0.09, 'sine', 0.11); tone(880, 0.06, 0.12, 'sine', 0.08); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, k) { tone(f, k * 0.11, 0.3, 'sine', 0.12); }); tone(1319, 0.46, 0.55, 'sine', 0.09); },
      inhale: function () { tone(262, 0, 3.8, 'sine', 0.035, 392); },
      exhale: function () { tone(392, 0, 4.8, 'sine', 0.035, 247); }
    };
    return {
      on: enabled,
      set: function (v) { store.set('son', !!v); },
      play: function (k) { if (enabled() && S[k]) { try { S[k](); } catch (e) { /* son indisponible */ } } }
    };
  })();

  // ---------------- MODE « PETIT LECTEUR » : lecture automatique à voix haute, gros boutons ----------------
  var lecteur = store.get('lecteur') === true;
  function applyLecteur() { document.documentElement.classList.toggle('petit-lecteur', lecteur); }
  function autoSay(text) { if (lecteur && voice && text) speak(text); }
  var ICON_SON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_MUET = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_LIVRE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6v14" stroke="currentColor" stroke-width="2"/></svg>';
  // barre de réglages des jeux : sons (retenu sur l'appareil) et lecture à voix haute (si une voix française est installée)
  function tools() {
    var bar = document.createElement('div');
    bar.className = 'game-tools';
    var son = document.createElement('button');
    son.type = 'button';
    son.className = 'tool tool-son';
    son.paint = function () {
      var on = sfx.on();
      son.setAttribute('aria-pressed', on ? 'true' : 'false');
      son.innerHTML = (on ? ICON_SON : ICON_MUET) + '<span>' + (on ? 'Sons' : 'Sons coupés') + '</span>';
    };
    son.paint();
    son.addEventListener('click', function () {
      sfx.set(!sfx.on());
      each('.tool-son', function (b) { if (b.paint) b.paint(); });
      sfx.play('pop');
    });
    var lec = document.createElement('button');
    lec.type = 'button';
    lec.className = 'tool tool-lecteur';
    lec.innerHTML = ICON_LIVRE + '<span>Lecture à voix haute</span>';
    lec.hidden = !voice;
    lec.setAttribute('aria-pressed', lecteur ? 'true' : 'false');
    lec.addEventListener('click', function () {
      lecteur = !lecteur;
      store.set('lecteur', lecteur);
      applyLecteur();
      each('.tool-lecteur', function (b) { b.setAttribute('aria-pressed', lecteur ? 'true' : 'false'); });
      if (lecteur) speak('Je lis les questions à voix haute.'); else hush();
    });
    bar.appendChild(son);
    bar.appendChild(lec);
    return bar;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function readJSON(id) { return JSON.parse(document.getElementById(id).textContent); }

  // ---------------- QUIZ (et jeux à choix illustrés) ----------------
  function initQuiz(root) {
    var data = JSON.parse(document.getElementById(root.dataset.src).textContent);
    var epId = root.dataset.ep;
    var game = root.dataset.key; // jeu : réussite enregistrée sous cette clé
    var base = root.dataset.base || '';
    var i = 0, score = 0, results = [];
    // jeux : questions mélangées à chaque partie ; quiz des épisodes : dans l'ordre de la vidéo. Réponses toujours mélangées.
    var order = game ? shuffle(data.slice()) : data.slice();
    var tb = tools();
    function render() {
      hush();
      root.innerHTML = '';
      root.appendChild(tb);
      var prog = document.createElement('div');
      prog.className = 'progress';
      prog.setAttribute('aria-hidden', 'true');
      data.forEach(function (_, k) {
        var s = document.createElement('span');
        if (k < results.length) s.className = results[k] ? 'done' : 'miss';
        else if (k === i) s.className = 'now';
        prog.appendChild(s);
      });
      root.appendChild(prog);
      if (i >= data.length) return renderEnd();
      var item = order[i];
      var idx = shuffle(item.a.map(function (_, k) { return k; }));
      var said = function () { return item.q + ' … ' + idx.map(function (k) { return item.a[k]; }).join(' … ') + '.'; };
      var head = document.createElement('div');
      head.className = 'qrow';
      var q = document.createElement('p');
      q.className = 'q';
      q.id = 'q-' + (epId || game) + '-' + i;
      q.textContent = 'Question ' + (i + 1) + ' sur ' + data.length + ' : ' + item.q;
      head.appendChild(q);
      head.appendChild(speakBtn('Écouter la question et les réponses', said));
      root.appendChild(head);
      var ans = document.createElement('div');
      ans.className = 'answers' + (item.img ? ' tiles' : '') + (game && !item.img && item.a.every(function (x) { return x.length < 5; }) ? ' digits' : '');
      ans.setAttribute('role', 'group');
      ans.setAttribute('aria-labelledby', q.id);
      var why = document.createElement('div');
      why.className = 'why';
      why.setAttribute('aria-live', 'polite');
      why.hidden = true;
      idx.forEach(function (k) {
        var txt = item.a[k];
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.k = k;
        if (item.img) {
          var im = document.createElement('img');
          im.src = base + 'assets/img/item-' + item.img[k] + '.webp';
          im.alt = '';
          im.width = 120;
          im.height = 120;
          b.appendChild(im);
          var nm = document.createElement('span');
          nm.textContent = txt;
          b.appendChild(nm);
        } else {
          b.textContent = txt;
        }
        b.addEventListener('click', function () {
          var ok = k === item.ok;
          if (ok) score++;
          results.push(ok);
          Array.prototype.forEach.call(ans.children, function (x) {
            x.disabled = true;
            if (+x.dataset.k === item.ok) x.classList.add('good');
          });
          if (!ok) b.classList.add('bad');
          sfx.play(ok ? 'good' : 'bad');
          why.hidden = false;
          var wt = document.createElement('p');
          wt.textContent = (ok ? 'Bravo ! ' : 'Presque ! ') + item.why;
          autoSay(wt.textContent);
          why.appendChild(wt);
          why.appendChild(speakBtn('Écouter l\'explication', function () { return wt.textContent; }));
          var row = document.createElement('div');
          row.className = 'row';
          var next = document.createElement('button');
          next.type = 'button';
          next.className = 'btn small';
          next.textContent = i + 1 < data.length ? 'Question suivante →' : 'Voir mon score';
          next.addEventListener('click', function () {
            i++;
            render();
            var h = root.querySelector('.q');
            if (h) { h.tabIndex = -1; h.focus(); }
          });
          row.appendChild(next);
          root.appendChild(row);
          frTypo(why);
          next.focus();
        });
        ans.appendChild(b);
      });
      root.appendChild(ans);
      root.appendChild(why);
      frTypo(root);
      autoSay(said());
    }
    function renderEnd() {
      var end = document.createElement('div');
      end.className = 'end';
      var win = score >= data.length - 1;
      if (game) {
        if (win) store.set(game, true);
      } else {
        store.set('quiz:' + epId, Math.max(score, store.get('quiz:' + epId) || 0));
      }
      var msg = score === data.length ? (root.dataset.done || 'Parfait ! Tu es un P\'tit Patient expert !')
        : score >= data.length - 2 ? 'Super ! Tu as presque tout bon !'
        : game ? 'Bien joué ! Revois l\'épisode, et réessaie !' : 'Bien joué ! Regarde la vidéo encore une fois, et réessaie !';
      end.innerHTML = '<p class="big">' + score + ' / ' + data.length + '</p><p class="q"></p>';
      end.querySelector('.q').textContent = msg;
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn alt small';
      again.textContent = game ? 'Rejouer' : 'Recommencer le quiz';
      again.addEventListener('click', function () { i = 0; score = 0; results = []; if (game) shuffle(order); render(); });
      end.appendChild(again);
      var more = document.createElement('a');
      more.className = 'btn small';
      if (game) {
        more.href = root.dataset.more;
        more.textContent = root.dataset.moreLabel;
        end.appendChild(more);
      } else if (win) {
        more.href = base + 'imprimer/diplome.html';
        more.textContent = 'Imprimer mon diplôme';
        end.appendChild(more);
      }
      root.appendChild(end);
      frTypo(end);
      autoSay(score + ' sur ' + data.length + '. ' + msg);
      if (win) { confetti(); sfx.play('win'); }
    }
    root.tabIndex = -1;
    render();
  }

  // ---------------- PROGRESSION (accueil, jeux) ----------------
  function initProgress() {
    each('[data-stars]', function (el) {
      var best = store.get('quiz:' + el.dataset.stars);
      if (best) el.textContent = '★ Quiz : ' + best + '/5';
    });
    each('[data-seen]', function (el) { if (store.get('vu:' + el.dataset.seen)) el.hidden = false; });
    each('.done[data-done]', function (el) { if (store.get(el.dataset.done)) el.hidden = false; });
    var box = document.getElementById('parcours');
    if (!box) return;
    var eps = box.dataset.eps.split(','), stars = box.querySelectorAll('.stars6 span'), n = 0;
    eps.forEach(function (id, k) {
      if ((store.get('quiz:' + id) || 0) >= 4) { n++; stars[k].classList.add('on'); }
    });
    var msg = box.querySelector('.msg');
    if (n === 0) {
      msg.textContent = 'Regarde un épisode, puis réussis son quiz (4 bonnes réponses sur 5) pour gagner ta première étoile !';
    } else if (n < eps.length) {
      msg.textContent = 'Tu as gagné ' + n + (n > 1 ? ' étoiles' : ' étoile') + ' sur ' + eps.length + '. Continue comme ça !';
    } else {
      msg.textContent = 'Bravo ! Tu as les ' + eps.length + ' étoiles : tu es un vrai P\'tit Patient expert ! ';
      var a = document.createElement('a');
      a.href = 'imprimer/diplome.html';
      a.textContent = 'Imprimer mon diplôme';
      msg.appendChild(a);
    }
    frTypo(msg);
    box.hidden = false;
  }

  // ---------------- VIDÉO : chapitres, texte, « déjà vu » ----------------
  function initVideo() {
    var v = document.getElementById('ep-video');
    if (!v) return;
    var id = v.dataset.ep;
    var after = document.querySelector('.after-video');
    var chaps = document.querySelectorAll('.chapters a');
    var starts = Array.prototype.map.call(chaps, function (a) { return parseFloat(a.dataset.t); });
    function at(t) { try { v.currentTime = t; } catch (e) { /* métadonnées pas encore chargées */ } }
    function seek(t) {
      if (v.readyState >= 1) at(t); else v.addEventListener('loadedmetadata', function () { at(t); }, { once: true });
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      var r = v.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) v.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    each('a[data-t]', function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); seek(parseFloat(a.dataset.t)); });
    });
    var m = /[?&#]t=(\d+(?:\.\d+)?)/.exec(location.search + location.hash);
    if (m) {
      var t0 = parseFloat(m[1]);
      if (v.readyState >= 1) at(t0); else v.addEventListener('loadedmetadata', function () { at(t0); }, { once: true });
    }
    v.addEventListener('timeupdate', function () {
      var t = v.currentTime, k = -1;
      for (var i = 0; i < starts.length; i++) if (t >= starts[i] - 0.05) k = i;
      Array.prototype.forEach.call(chaps, function (a, j) {
        if (j === k) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      if (v.duration && t / v.duration > 0.9) store.set('vu:' + id, true);
    });
    v.addEventListener('ended', function () {
      store.set('vu:' + id, true);
      if (after) after.hidden = false;
    });
  }

  // ---------------- JEU « PRÉPARE TON SAC » ----------------
  function initGame(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.item'));
    var bag = root.querySelector('.bag');
    var inbag = root.querySelector('.inbag');
    var bubble = root.querySelector('.bubble .txt');
    var count = root.querySelector('.count');
    var win = root.querySelector('.win');
    var need = items.filter(function (it) { return it.dataset.good === '1'; }).length;
    var got = 0;
    var box = root.querySelector('.items');
    root.querySelector('.game-top').appendChild(tools());
    function mix() { shuffle(items.slice()).forEach(function (it) { box.appendChild(it); }); }
    function say(t) { bubble.textContent = t; frTypo(bubble); autoSay(t); }
    function update() { count.textContent = 'Dans le sac : ' + got + ' / ' + need; }
    function drop(it) {
      if (it.dataset.good === '1') {
        it.classList.add('gone');
        it.setAttribute('aria-disabled', 'true');
        it.tabIndex = -1;
        var mini = it.querySelector('img').cloneNode();
        mini.alt = it.dataset.name;
        inbag.appendChild(mini);
        got++;
        update();
        say(it.dataset.msg);
        sfx.play('pop');
        bag.classList.add('hot');
        setTimeout(function () { bag.classList.remove('hot'); }, 250);
        if (got === need) {
          setTimeout(function () { win.classList.add('on'); win.querySelector('h2').focus(); confetti(); sfx.play('win'); }, 700);
          store.set('jeu:sac', true);
        }
      } else {
        say(it.dataset.msg);
        sfx.play('bad');
        shake(it);
      }
    }
    function overBag(x, y) {
      var r = bag.getBoundingClientRect();
      return x > r.left && x < r.right && y > r.top && y < r.bottom;
    }
    items.forEach(function (it) {
      it.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(it); }
      });
      it.addEventListener('pointerdown', function (e) {
        if (it.classList.contains('gone')) return;
        e.preventDefault();
        it.setPointerCapture(e.pointerId);
        var sx = e.clientX, sy = e.clientY, moved = false;
        it.classList.add('dragging');
        function move(ev) {
          var dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
          it.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.08)';
          bag.classList.toggle('hot', overBag(ev.clientX, ev.clientY));
        }
        function up(ev) {
          it.removeEventListener('pointermove', move);
          it.removeEventListener('pointerup', up);
          it.removeEventListener('pointercancel', up);
          it.classList.remove('dragging');
          it.style.transform = '';
          bag.classList.remove('hot');
          if (!moved || overBag(ev.clientX, ev.clientY)) drop(it);
        }
        it.addEventListener('pointermove', move);
        it.addEventListener('pointerup', up);
        it.addEventListener('pointercancel', up);
      });
    });
    root.querySelector('.again').addEventListener('click', function () {
      got = 0; inbag.innerHTML = ''; win.classList.remove('on');
      items.forEach(function (it) { it.classList.remove('gone'); it.removeAttribute('aria-disabled'); it.tabIndex = 0; });
      mix(); update(); say('Glisse dans le sac tout ce qu\'il faut pour aller chez le médecin !');
    });
    mix();
    update();
  }

  // ---------------- JEU « LES PAIRES DU MÉDECIN » ----------------
  function initMemory(root) {
    var data = readJSON(root.dataset.src);
    var grid = root.querySelector('.mgrid'), count = root.querySelector('.count'), bubble = root.querySelector('.bubble .txt');
    var levels = root.querySelectorAll('.levels button');
    root.querySelector('.game-top').appendChild(tools());
    var n = lecteur ? 4 : 6, open = [], found = 0, moves = 0, lock = false;
    function say(t) { bubble.textContent = t; frTypo(bubble); autoSay(t); }
    // deux blocs insécables : sur téléphone, « Coups » passe à la ligne entier (pas de « · » orphelin en bout de ligne)
    function update() { count.innerHTML = '<span>Paires trouvées : ' + found + ' sur ' + n + '</span><span>Coups : ' + moves + '</span>'; }
    function explain(c) {
      // le nom de l'objet devant l'explication, sauf si l'explication le dit déjà
      var w = c.name.replace(/^(le |la |l'|un |une )/i, '').toLowerCase();
      return c.why.toLowerCase().indexOf(w) === -1 ? c.name + ' ! ' + c.why : c.why;
    }
    function deal() {
      open = []; found = 0; moves = 0; lock = false;
      grid.innerHTML = '';
      grid.dataset.n = n;
      Array.prototype.forEach.call(levels, function (b) { b.setAttribute('aria-pressed', +b.dataset.n === n ? 'true' : 'false'); });
      var pick = shuffle(data.slice()).slice(0, n);
      shuffle(pick.concat(pick)).forEach(function (c, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mcard';
        b.setAttribute('aria-label', 'Carte ' + (k + 1) + ', face cachée');
        b.innerHTML = '<span class="mback" aria-hidden="true"></span><span class="mfront" aria-hidden="true"><img src="assets/img/item-' + c.k +
          '.webp" alt="" width="120" height="120"><span class="mname"></span></span>';
        b.querySelector('.mname').textContent = c.name;
        b.addEventListener('click', function () { flip(b, c); });
        grid.appendChild(b);
      });
      update();
      say('Retourne deux cartes pour trouver les paires !');
    }
    function flip(b, c) {
      if (lock || b.classList.contains('up')) return;
      b.classList.add('up');
      b.setAttribute('aria-label', c.name);
      sfx.play('flip');
      open.push({ b: b, c: c });
      if (open.length < 2) { autoSay(c.name); return; }
      moves++;
      var a = open[0], z = open[1];
      open = [];
      if (a.c.k === z.c.k) {
        found++;
        [a, z].forEach(function (o) { o.b.classList.add('won'); o.b.disabled = true; });
        sfx.play('good');
        say(explain(c));
        update();
        if (found === n) setTimeout(win, 900);
      } else {
        lock = true;
        update();
        autoSay(c.name);
        setTimeout(function () {
          [a, z].forEach(function (o) { o.b.classList.remove('up'); o.b.setAttribute('aria-label', 'Carte face cachée'); });
          lock = false;
        }, 1100);
      }
    }
    function win() {
      store.set(root.dataset.key, true);
      var best = store.get('paires:' + n);
      if (!best || moves < best) store.set('paires:' + n, moves);
      say(root.dataset.done + ' En ' + moves + ' coups' + (best && moves >= best ? ' (ton record : ' + best + ').' : ' : c\'est ton record !'));
      sfx.play('win');
      confetti();
    }
    Array.prototype.forEach.call(levels, function (b) { b.addEventListener('click', function () { n = +b.dataset.n; deal(); }); });
    deal();
  }

  // ---------------- JEU « LE TRAJET DE L'ORDONNANCE » ----------------
  function initOrder(root) {
    var steps = readJSON(root.dataset.src);
    var slots = root.querySelector('.slots'), pool = root.querySelector('.pool'), count = root.querySelector('.count'), bubble = root.querySelector('.bubble .txt');
    root.querySelector('.game-top').appendChild(tools());
    var next = 0, end = null;
    function say(t) { bubble.textContent = t; frTypo(bubble); autoSay(t); }
    function setup() {
      next = 0;
      slots.innerHTML = '';
      pool.innerHTML = '';
      if (end) { end.remove(); end = null; }
      steps.forEach(function (s, k) {
        var li = document.createElement('li');
        li.className = 'slot';
        li.innerHTML = '<span class="snum">' + (k + 1) + '</span>';
        slots.appendChild(li);
      });
      shuffle(steps.map(function (s, k) { return k; })).forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ocard';
        b.innerHTML = '<img src="assets/img/item-' + steps[k].img + '.webp" alt="" width="120" height="120"><span></span>';
        b.querySelector('span').textContent = steps[k].label;
        b.addEventListener('click', function () { pick(b, k); });
        pool.appendChild(b);
      });
      count.textContent = 'Étape 1 sur ' + steps.length;
      frTypo(pool);
      say('Quelle est la première étape ?');
    }
    function pick(b, k) {
      if (b.disabled) return;
      if (k !== next) {
        sfx.play('bad');
        shake(b);
        say('Pas encore ! Quelle est l\'étape n° ' + (next + 1) + ' ?');
        return;
      }
      sfx.play('good');
      b.disabled = true;
      b.classList.add('placed');
      slots.children[k].classList.add('filled');
      slots.children[k].appendChild(b);
      next++;
      say(steps[k].text);
      if (next < steps.length) { count.textContent = 'Étape ' + (next + 1) + ' sur ' + steps.length; return; }
      count.textContent = 'Bravo, tout est dans l\'ordre !';
      store.set(root.dataset.key, true);
      end = document.createElement('div');
      end.className = 'gend';
      end.innerHTML = '<p class="recap"></p>';
      end.querySelector('.recap').textContent = root.dataset.recap;
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn alt small';
      again.textContent = 'Rejouer';
      again.addEventListener('click', setup);
      end.appendChild(again);
      root.appendChild(end);
      frTypo(end);
      setTimeout(function () { sfx.play('win'); confetti(); }, 400);
    }
    setup();
  }

  // ---------------- JEU « RESPIRE AVEC MOI » ----------------
  function initBreathe(root) {
    var d = readJSON(root.dataset.src);
    root.querySelector('.game-top').appendChild(tools());
    var label = root.querySelector('.blabel'), btn = root.querySelector('.bstart'), count = root.querySelector('.count'), bubble = root.querySelector('.bubble .txt');
    var N = 3, IN = 4000, OUT = 5000, timer = null, running = false;
    function say(t) { bubble.textContent = t; frTypo(bubble); }
    function stop(done) {
      clearTimeout(timer);
      running = false;
      root.classList.remove('inhale', 'exhale');
      btn.textContent = done ? 'Recommencer' : 'Commencer';
    }
    function cycle(k) {
      if (k >= N) {
        stop(true);
        store.set(root.dataset.key, true);
        count.textContent = 'Bravo !';
        label.textContent = d.end;
        say(d.end + ' ' + d.courage);
        autoSay(d.end + ' ' + d.courage);
        sfx.play('win');
        return;
      }
      count.textContent = 'Respiration ' + (k + 1) + ' sur ' + N;
      root.classList.remove('exhale');
      root.classList.add('inhale');
      label.textContent = d['in'];
      sfx.play('inhale');
      autoSay(d['in']);
      timer = setTimeout(function () {
        root.classList.remove('inhale');
        root.classList.add('exhale');
        label.textContent = d.out;
        sfx.play('exhale');
        autoSay(d.out);
        timer = setTimeout(function () { cycle(k + 1); }, OUT);
      }, IN);
    }
    btn.addEventListener('click', function () {
      if (running) { stop(false); label.textContent = ''; count.textContent = N + ' respirations'; say(d.intro); return; }
      running = true;
      btn.textContent = 'Arrêter';
      say(d.intro);
      label.textContent = d.count;
      autoSay(d.count);
      count.textContent = 'Prêt ?';
      timer = setTimeout(function () { cycle(0); }, 2200);
    });
    window.addEventListener('pagehide', function () { clearTimeout(timer); });
  }

  // ---------------- JEU « MÉDICAMENT OU BONBON ? » ----------------
  function initSort(root) {
    var d = readJSON(root.dataset.src);
    var stage = root.querySelector('.sstage'), count = root.querySelector('.count');
    root.querySelector('.game-top').appendChild(tools());
    var order, i, score, total = d.cards.length + 1;
    function why(text, nextLabel, onNext) {
      var w = document.createElement('div');
      w.className = 'why';
      var p = document.createElement('p');
      p.textContent = text;
      w.appendChild(p);
      w.appendChild(speakBtn('Écouter l\'explication', function () { return p.textContent; }));
      stage.appendChild(w);
      var row = document.createElement('div');
      row.className = 'row';
      var nb = document.createElement('button');
      nb.type = 'button';
      nb.className = 'btn small';
      nb.textContent = nextLabel;
      nb.addEventListener('click', onNext);
      row.appendChild(nb);
      stage.appendChild(row);
      frTypo(stage);
      autoSay(text);
      nb.focus();
    }
    function start() { order = shuffle(d.cards.slice()); i = 0; score = 0; card(); }
    function card() {
      if (i >= order.length) return final();
      var c = order[i];
      count.textContent = 'Image ' + (i + 1) + ' sur ' + order.length;
      stage.innerHTML = '<div class="scard"><img src="assets/img/item-' + c.k + '.webp" alt="" width="220" height="220"><p class="sname"></p></div>' +
        '<p class="q">Médicament ou bonbon ?</p><div class="schoice"><button type="button" class="btn sbtn" data-kind="med">Médicament</button>' +
        '<button type="button" class="btn alt sbtn" data-kind="bonbon">Bonbon</button></div>';
      stage.querySelector('.sname').textContent = c.name;
      autoSay(c.name + '. Médicament ou bonbon ?');
      each('.sbtn', function (b) {
        b.addEventListener('click', function () {
          var ok = b.dataset.kind === c.kind;
          if (ok) score++;
          sfx.play(ok ? 'good' : 'bad');
          each('.sbtn', function (x) { x.disabled = true; if (x.dataset.kind === c.kind) x.classList.add('good'); }, stage);
          if (!ok) b.classList.add('bad');
          var t = c.kind === 'med' ? (ok ? 'Oui, c\'est un médicament ! ' + c.why : 'Non ! ' + d.never) : (ok ? 'Oui, c\'est un bonbon !' : 'Non, c\'est un bonbon !');
          why(t, i + 1 < order.length ? 'Image suivante →' : 'Dernière question →', function () { i++; card(); });
        });
      }, stage);
    }
    function final() {
      var q = d.final, idx = shuffle(q.a.map(function (_, k) { return k; }));
      count.textContent = 'Dernière question';
      stage.innerHTML = '<div class="scard"><img src="assets/img/item-syrup.webp" alt="" width="220" height="220"></div><p class="q"></p><div class="answers"></div>';
      stage.querySelector('.q').textContent = q.q;
      var ans = stage.querySelector('.answers');
      autoSay(q.q + ' … ' + idx.map(function (k) { return q.a[k]; }).join(' … '));
      idx.forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = q.a[k];
        b.dataset.k = k;
        b.addEventListener('click', function () {
          var ok = k === q.ok;
          if (ok) score++;
          sfx.play(ok ? 'good' : 'bad');
          Array.prototype.forEach.call(ans.children, function (x) { x.disabled = true; if (+x.dataset.k === q.ok) x.classList.add('good'); });
          if (!ok) b.classList.add('bad');
          why((ok ? 'Bravo ! ' : 'Presque ! ') + q.why + ' ' + d.store, 'Voir mon score', finish);
        });
        ans.appendChild(b);
      });
      frTypo(stage);
    }
    function finish() {
      var win = score >= total - 1;
      if (win) store.set(root.dataset.key, true);
      count.textContent = 'Fini !';
      stage.innerHTML = '<div class="end"><p class="big">' + score + ' / ' + total + '</p><p class="q"></p><p class="recap"></p></div>';
      stage.querySelector('.q').textContent = win ? 'Bravo ! Tu sais reconnaître les médicaments !' : 'Bien joué ! Revois l\'épisode, et réessaie !';
      stage.querySelector('.recap').textContent = d.recap;
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn alt small';
      again.textContent = 'Rejouer';
      again.addEventListener('click', start);
      stage.querySelector('.end').appendChild(again);
      frTypo(stage);
      autoSay(score + ' sur ' + total + '. ' + d.recap);
      if (win) { confetti(); sfx.play('win'); }
    }
    start();
  }

  // ---------------- BADGES ET SUPER DIPLÔME ----------------
  function initBadges() {
    each('[data-badges]', function (box) {
      var keys = box.dataset.badges.split(','), n = 0;
      each('.badge', function (li) { if (store.get(li.dataset.badge)) { li.classList.add('got'); n++; } }, box);
      box.querySelector('.bcount').textContent = n + ' / ' + keys.length;
      var link = box.querySelector('[data-super-link]');
      if (link && n === keys.length) {
        link.classList.add('open');
        link.querySelector('.lock').textContent = 'Bravo ! Tu as tous les badges !';
        link.querySelector('.unlocked').hidden = false;
      }
    });
  }
  function initSuper() {
    each('[data-super]', function (box) {
      var miss = box.dataset['super'].split(',').filter(function (k) { return !store.get(k); });
      box.querySelector('.super-locked').hidden = miss.length === 0;
      box.querySelector('.super-ok').style.display = miss.length ? 'none' : 'grid';
      each('.smissing li', function (li) { li.hidden = !!store.get(li.dataset.badge); }, box);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyLecteur();
    if (synth) {
      pickVoice();
      if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
      window.addEventListener('pagehide', hush);
    }
    each('.quiz[data-src]', initQuiz);
    each('.game', initGame);
    each('.memory[data-src]', initMemory);
    each('.order-game[data-src]', initOrder);
    each('.breathe[data-src]', initBreathe);
    each('.sort-game[data-src]', initSort);
    initBadges();
    initSuper();
    initProgress();
    initVideo();
    each('[data-reset]', function (b) {
      b.addEventListener('click', function () {
        if (!window.confirm('Effacer les étoiles, les épisodes vus et les jeux réussis sur cet appareil ?')) return;
        try {
          for (var k = localStorage.length - 1; k >= 0; k--) {
            var key = localStorage.key(k);
            if (key && key.indexOf('pp:') === 0 && key !== 'pp:prenom') localStorage.removeItem(key);
          }
        } catch (e) { /* stockage indisponible */ }
        b.textContent = 'Progression effacée';
        b.disabled = true;
      });
    });
  });
})();
