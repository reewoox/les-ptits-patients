// Les P'tits Patients — petits scripts du site (aucune donnée envoyée, aucun cookie).
(function () {
  'use strict';

  // mémoire locale, facultative (navigation privée, stockage bloqué : tout marche quand même)
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('pp:' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('pp:' + k, JSON.stringify(v)); } catch (e) { /* rien */ } }
  };
  window.ppStore = store;

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

  // ---------------- QUIZ ----------------
  function initQuiz(root) {
    var data = JSON.parse(document.getElementById(root.dataset.src).textContent);
    var epId = root.dataset.ep;
    var i = 0, score = 0, results = [];
    function render() {
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
      var q = document.createElement('p');
      q.className = 'q';
      q.id = 'q-' + epId + '-' + i;
      q.textContent = 'Question ' + (i + 1) + ' sur ' + data.length + ' : ' + item.q;
      root.appendChild(q);
      var ans = document.createElement('div');
      ans.className = 'answers';
      ans.setAttribute('role', 'group');
      ans.setAttribute('aria-labelledby', q.id);
      var why = document.createElement('p');
      why.className = 'why';
      why.setAttribute('aria-live', 'polite');
      why.hidden = true;
      item.a.forEach(function (txt, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = txt;
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
          why.textContent = (ok ? 'Bravo ! ' : 'Presque ! ') + item.why;
          var row = document.createElement('div');
          row.className = 'row';
          var next = document.createElement('button');
          next.type = 'button';
          next.className = 'btn small';
          next.textContent = i + 1 < data.length ? 'Question suivante →' : 'Voir mon score';
          next.addEventListener('click', function () {
            i++;
            render();
            var head = root.querySelector('.q');
            if (head) { head.tabIndex = -1; head.focus(); }
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
      var best = Math.max(score, store.get('quiz:' + epId) || 0);
      store.set('quiz:' + epId, best);
      var msg = score === data.length ? 'Parfait ! Tu es un P\'tit Patient expert !'
        : score >= data.length - 2 ? 'Super ! Tu as presque tout bon !' : 'Bien joué ! Regarde la vidéo encore une fois, et réessaie !';
      end.innerHTML = '<p class="big">' + score + ' / ' + data.length + '</p><p class="q"></p>';
      end.querySelector('.q').textContent = msg;
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn alt small';
      again.textContent = 'Recommencer le quiz';
      again.addEventListener('click', function () { i = 0; score = 0; results = []; render(); });
      var dip = document.createElement('a');
      dip.className = 'btn small';
      dip.href = (root.dataset.base || '') + 'imprimer/diplome.html';
      dip.textContent = 'Imprimer mon diplôme';
      end.appendChild(again);
      if (score >= data.length - 1) end.appendChild(dip);
      root.appendChild(end);
      if (score >= data.length - 1) confetti();
    }
    root.tabIndex = -1;
    render();
  }

  // étoiles des quiz réussis sur l'accueil
  function initStars() {
    document.querySelectorAll('[data-stars]').forEach(function (el) {
      var best = store.get('quiz:' + el.dataset.stars);
      if (best) el.textContent = '★ Quiz : ' + best + '/5';
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
    document.querySelectorAll('.quiz[data-src]').forEach(initQuiz);
    document.querySelectorAll('.game').forEach(initGame);
    initStars();
  });
})();
