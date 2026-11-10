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
    each('.speak', function (b) { b.hidden = !voice; });
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

  // ---------------- QUIZ (et jeux à choix illustrés) ----------------
  function initQuiz(root) {
    var data = JSON.parse(document.getElementById(root.dataset.src).textContent);
    var epId = root.dataset.ep;
    var game = root.dataset.key; // jeu : réussite enregistrée sous cette clé
    var base = root.dataset.base || '';
    var i = 0, score = 0, results = [];
    function render() {
      hush();
      root.innerHTML = '';
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
      var item = data[i];
      var head = document.createElement('div');
      head.className = 'qrow';
      var q = document.createElement('p');
      q.className = 'q';
      q.id = 'q-' + (epId || game) + '-' + i;
      q.textContent = 'Question ' + (i + 1) + ' sur ' + data.length + ' : ' + item.q;
      head.appendChild(q);
      head.appendChild(speakBtn('Écouter la question et les réponses', function () { return item.q + ' … ' + item.a.join(' … ') + '.'; }));
      root.appendChild(head);
      var ans = document.createElement('div');
      ans.className = 'answers' + (item.img ? ' tiles' : '') + (game && !item.img && item.a.every(function (x) { return x.length < 5; }) ? ' digits' : '');
      ans.setAttribute('role', 'group');
      ans.setAttribute('aria-labelledby', q.id);
      var why = document.createElement('div');
      why.className = 'why';
      why.setAttribute('aria-live', 'polite');
      why.hidden = true;
      item.a.forEach(function (txt, k) {
        var b = document.createElement('button');
        b.type = 'button';
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
          Array.prototype.forEach.call(ans.children, function (x, m) {
            x.disabled = true;
            if (m === item.ok) x.classList.add('good');
          });
          if (!ok) b.classList.add('bad');
          why.hidden = false;
          var wt = document.createElement('p');
          wt.textContent = (ok ? 'Bravo ! ' : 'Presque ! ') + item.why;
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
          next.focus();
        });
        ans.appendChild(b);
      });
      root.appendChild(ans);
      root.appendChild(why);
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
      again.addEventListener('click', function () { i = 0; score = 0; results = []; render(); });
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
      if (win) confetti();
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
    function say(t) { bubble.textContent = t; }
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
        bag.classList.add('hot');
        setTimeout(function () { bag.classList.remove('hot'); }, 250);
        if (got === need) {
          setTimeout(function () { win.classList.add('on'); win.querySelector('h2').focus(); confetti(); }, 700);
          store.set('jeu:sac', true);
        }
      } else {
        say(it.dataset.msg);
        it.classList.remove('shake');
        void it.offsetWidth;
        it.classList.add('shake');
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
      update(); say('Glisse dans le sac tout ce qu\'il faut pour aller chez le médecin !');
    });
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (synth) {
      pickVoice();
      if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
      window.addEventListener('pagehide', hush);
    }
    each('.quiz[data-src]', initQuiz);
    each('.game', initGame);
    initProgress();
    initVideo();
  });
})();
