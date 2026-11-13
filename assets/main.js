// Tallymade site.
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // "Get the app" goes straight to the store on phones.
  var ua = navigator.userAgent || '';
  var asLink = $('.badges .as'), gpLink = $('.badges .gp');
  var store = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ? (asLink && asLink.href) : /Android/.test(ua) ? (gpLink && gpLink.href) : null;
  if (store) $$('[data-store]').forEach(function (a) { a.href = store; });

  // Header shadow once the page scrolls.
  var top = $('#top');
  if (top) {
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal on scroll.
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.rv').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  // Number tween for prices.
  function tween(el, to, fmt) {
    if (!el) return;
    var from = parseFloat(el.getAttribute('data-v'));
    el.setAttribute('data-v', to);
    if (reduce || isNaN(from) || !isFinite(to) || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now(), d = 650;
    (function step(t) {
      var k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- Story: where the money goes (the app's example candle, Etsy US) ----------
  // Fixed results from the app's example candle; nothing is calculated here.
  var EX = {
    mat: 3.81, time: 1.88, ext: 0.35,
    8: { fee: 1.21, pro: 0.76, ok: false },
    11: { fee: 1.49, pro: 3.48, ok: true }
  };
  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function story(p) {
    var r = EX[p];
    if (!r) return;
    var parts = { mat: EX.mat, time: EX.time, ext: EX.ext, fee: r.fee, pro: r.pro };
    Object.keys(parts).forEach(function (k) { var g = $('[data-g=' + k + ']'); if (g) g.style.flexGrow = parts[k]; });
    var pe = $('[data-s=price]'); if (pe) pe.textContent = usd.format(p);
    tween($('[data-s=fee]'), r.fee, function (v) { return usd.format(v); });
    tween($('[data-s=pro]'), r.pro, function (v) { return usd.format(v); });
    var v = $('[data-s=verdict]');
    if (!v) return;
    v.className = 'verdict ' + (r.ok ? 'ok' : 'warn');
    var sp = v.querySelector('span'), path = v.querySelector('path');
    if (sp) sp.textContent = r.ok ? 'This price meets your 30% target.' : 'Below your 30% target. $11.00 would hit it.';
    if (path) path.setAttribute('d', r.ok ? 'M12 2a10 10 0 100 20 10 10 0 000-20zm-1.4 14.2L6.8 12.4l1.4-1.4 2.4 2.4 5.2-5.2 1.4 1.4-6.6 6.6z' : 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z');
  }
  var toggles = $$('.toggle button');
  toggles.forEach(function (b) {
    b.addEventListener('click', function () {
      toggles.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      story(parseInt(b.getAttribute('data-p'), 10));
    });
  });
  var split = $('.split');
  if (split) {
    story(8);
    // Auto-play the switch once when the section comes into view.
    if ('IntersectionObserver' in window && !reduce) {
      var played = false;
      var so = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !played) {
          played = true; so.disconnect();
          setTimeout(function () { var b = $('.toggle button[data-p="11"]'); if (b) b.classList.add('pulse'); }, 1800);
        }
      }, { threshold: 0.5 });
      so.observe(split);
    }
  }

  // ---------- How it works: swap the phone screen with the active step ----------
  var steps = $$('.steps li'), shots = $$('.how .screen img');
  if ('IntersectionObserver' in window && window.matchMedia('(min-width: 961px)').matches) {
    var ho = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = steps.indexOf(e.target);
        steps.forEach(function (s, j) { s.classList.toggle('on', j === i); });
        shots.forEach(function (s, j) { s.classList.toggle('on', j === i); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { ho.observe(s); });
  }

  // ---------- Free price check: shows only the result, never the working ----------
  // Fee rates mirror the app's built-in presets (src/core/channels.ts, checked Oct–Nov 2026).
  var PC = {
    'etsy-uk': { c: 'GBP', p: 13.176, f: 0.42 },
    'etsy-us': { c: 'USD', p: 9.5, f: 0.45 },
    'square-uk': { c: 'GBP', p: 1.75, f: 0 },
    'square-us': { c: 'USD', p: 2.6, f: 0.15 },
    'cash-gbp': { c: 'GBP', p: 0, f: 0 },
    'cash-usd': { c: 'USD', p: 0, f: 0 }
  };
  var pcForm = $('#pcheck');
  if (pcForm) {
    var num = function (id) {
      var raw = String($(id).value).trim();
      if (raw === '' || /-/.test(raw)) return NaN;
      var v = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
      v = v.replace(/[^0-9.]/g, '');
      return v === '' ? NaN : parseFloat(v);
    };
    var fmts = {
      GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    };
    var pcRun = function () {
      var ch = PC[$('#pc-ch').value] || PC['etsy-uk'], f = fmts[ch.c];
      $$('[data-cur]', pcForm).forEach(function (el) { el.textContent = ch.c === 'GBP' ? '£' : '$'; });
      var unit = ch.c === 'GBP' ? 'pounds' : 'dollars';
      $('#pc-price').setAttribute('aria-label', 'Your price, one piece, in ' + unit);
      $('#pc-sup').setAttribute('aria-label', 'Supplies for one piece, in ' + unit);
      var price = num('#pc-price'), sup = num('#pc-sup'), min = num('#pc-min');
      var ready = price > 0 && sup >= 0 && min > 0;
      $('[data-pc=empty]', pcForm).hidden = ready;
      $('[data-pc=done]', pcForm).hidden = !ready;
      pcForm.classList.toggle('loss', false);
      pcForm.classList.toggle('low', false);
      if (!ready) { $('#pc-say').textContent = ''; return; }
      var keep = price - (price * ch.p / 100 + ch.f) - sup;
      var hour = keep / (min / 60);
      tween($('#pc-keep'), keep, function (v) { return f.format(v); });
      if (keep < 0) { $('#pc-hour').setAttribute('data-v', 0); $('#pc-hour').textContent = f.format(0); } else tween($('#pc-hour'), hour, function (v) { return f.format(v); });
      var say = $('#pc-say');
      if (keep < 0) {
        pcForm.classList.toggle('loss', true);
        say.textContent = 'At this price you lose ' + f.format(-keep) + ' on every one you sell.';
      } else if (keep < price * 0.15) {
        pcForm.classList.toggle('low', true);
        say.textContent = 'You keep ' + f.format(keep) + ' a piece. Fees and supplies take most of this sale. Is ' + f.format(hour) + ' an hour what you want to pay yourself?';
      } else {
        say.textContent = 'You keep ' + f.format(keep) + ' a piece. Is ' + f.format(hour) + ' an hour what you want to pay yourself?';
      }
    };
    var pcT, pcQ = function () { clearTimeout(pcT); pcT = setTimeout(pcRun, 400); };
    ['#pc-ch', '#pc-price', '#pc-sup', '#pc-min'].forEach(function (id) {
      $(id).addEventListener('input', pcQ);
      $(id).addEventListener('change', pcRun);
    });
    pcRun();
  }

  // ---------- FAQ: smooth open and close ----------
  $$('.faq details').forEach(function (d) {
    var s = d.querySelector('summary'), a = d.querySelector('.ans');
    if (!s || !a) return;
    s.addEventListener('click', function (e) {
      if (reduce || !a.animate) return;
      e.preventDefault();
      if (d.open) {
        var h = a.offsetHeight;
        a.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 280, easing: 'ease-in' }).onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        var h2 = a.offsetHeight;
        a.animate([{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });
})();
