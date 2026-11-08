// Tallymade site. Pricing maths mirrors src/core/pricing.ts and src/core/result.ts in the app.
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // "Get the app" goes straight to the store on phones.
  var ua = navigator.userAgent || '';
  var store = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ? $('.badges .as').href : /Android/.test(ua) ? $('.badges .gp').href : null;
  if (store) $$('[data-store]').forEach(function (a) { a.href = store; });

  // Header shadow once the page scrolls.
  var top = $('#top');
  var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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
  var EX = { mat: 45.66 / 12, time: 1.875, ext: 0.35, pct: 0.095, fixed: 0.45, nonLabor: 45.66 / 12 + 0.35 };
  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function story(p) {
    var fee = p * EX.pct + EX.fixed, cost = EX.mat + EX.time + EX.ext, pro = p - fee - cost;
    var parts = { mat: EX.mat, time: EX.time, ext: EX.ext, fee: fee, pro: Math.max(0, pro) };
    Object.keys(parts).forEach(function (k) { $('[data-g=' + k + ']').style.flexGrow = parts[k]; });
    $('[data-s=price]').textContent = usd.format(p);
    tween($('[data-s=fee]'), fee, function (v) { return usd.format(v); });
    tween($('[data-s=pro]'), pro, function (v) { return usd.format(v); });
    var v = $('[data-s=verdict]');
    var ok = pro / p >= 0.3 - 1e-9;
    v.className = 'verdict ' + (ok ? 'ok' : 'warn');
    v.querySelector('span').textContent = ok ? 'This price meets your 30% target.' : 'Below your 30% target. $11.00 would hit it.';
    v.querySelector('path').setAttribute('d', ok ? 'M12 2a10 10 0 100 20 10 10 0 000-20zm-1.4 14.2L6.8 12.4l1.4-1.4 2.4 2.4 5.2-5.2 1.4 1.4-6.6 6.6z' : 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z');
  }
  $$('.toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.toggle button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      story(parseFloat(b.getAttribute('data-p')));
    });
  });
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
    so.observe($('.split'));
  }

  // ---------- Calculator ----------
  // Fee presets exactly as shipped in the app (src/core/channels.ts, version 1.0.2).
  var CH = [
    { id: 'etsy-us', cur: 'USD', name: 'Etsy (US seller)', pct: 6.5 + 3, fixed: 0.25 + 0.2, src: 'etsy.com/legal/fees and etsy.com/legal/etsy-payments, checked 15 Oct 2026', out: 'Not included: postage, Etsy Offsite Ads and fees on sales tax.' },
    { id: 'square-us', cur: 'USD', name: 'Square card reader (US, in person)', pct: 2.6, fixed: 0.15, src: 'squareup.com/us/en/payments/our-fees, checked 15 Oct 2026' },
    { id: 'direct-usd', cur: 'USD', name: 'Cash / direct (no fees)', pct: 0, fixed: 0 },
    { id: 'etsy-uk', cur: 'GBP', name: 'Etsy (UK seller)', pct: 6.5 + 4 + 0.48 + 2.196, fixed: 0.2 + 0.15 + 0.07, src: 'Etsy fees and help articles on transaction, payment processing, regulatory operating fee and VAT on seller fees, checked 6 Nov 2026. Includes 20% VAT on Etsy fees for sellers who are not VAT registered', out: 'Not included: postage and Etsy Offsite Ads.' },
    { id: 'square-uk', cur: 'GBP', name: 'Square card reader (UK, in person)', pct: 1.75, fixed: 0, src: 'squareup.com/gb/en/payments/our-fees, checked 15 Oct 2026' },
    { id: 'direct-gbp', cur: 'GBP', name: 'Cash / direct (no fees)', pct: 0, fixed: 0 }
  ];
  var cur = 'USD';
  var fmts = { USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }), GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }) };
  var money = function (v) { return fmts[cur].format(v); };
  var signed = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + fmts[cur].format(Math.abs(v)); };
  var sel = $('#f-ch');
  function fillChannels() {
    var keep = sel.value;
    sel.innerHTML = '';
    CH.filter(function (c) { return c.cur === cur; }).forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o);
    });
    if (keep && CH.some(function (c) { return c.id === keep && c.cur === cur; })) sel.value = keep;
    $$('[data-sym]').forEach(function (s) { s.textContent = cur === 'GBP' ? '£' : '$'; });
  }
  function num(id) {
    // Commas are thousands separators in USD and GBP ("1,250" is 1250).
    var raw = $(id).value.replace(/[^0-9.-]/g, '');
    return raw === '' ? NaN : parseFloat(raw);
  }
  function roundUpHalf(p) { var exact = Math.ceil(p * 100 - 1e-6) / 100; return Math.ceil(exact * 2 - 1e-9) / 2; }
  function R(k) { return $('[data-r=' + k + ']'); }

  function calc() {
    var n = num('#f-n'), mat = num('#f-mat'), min = num('#f-min'), wage = num('#f-wage'), ext = num('#f-ext'), tgt = num('#f-tgt');
    var ch = CH.filter(function (c) { return c.id === sel.value; })[0];
    var err = R('err');
    var bad = [n, mat, min, wage, ext, tgt].some(function (v) { return !isFinite(v) || v < 0; }) || n < 1;
    if (bad) { err.hidden = false; err.textContent = 'Fill in every box with a number (pieces per batch at least 1).'; return; }
    err.hidden = true;
    var pct = ch.pct / 100, fixed = ch.fixed;
    var nonLabor = mat / n + ext;
    var labor = (min / n / 60) * wage;
    var cost = nonLabor + labor;
    var hoursPer = min / n / 60;
    R('chname').textContent = 'Price for ' + ch.name;
    R('src').textContent = ch.src ? ch.name + ': ' + ch.src : 'Cash / direct: no fees';
    var denom = 1 - pct - tgt / 100;
    if (denom <= 0.0001) {
      R('price').textContent = '—'; R('price').removeAttribute('data-v');
      R('sub').textContent = 'A ' + tgt + '% profit isn’t possible after this channel’s fees. Lower your target.';
      ['fees', 'profit', 'hour'].forEach(function (k) { R(k).textContent = '—'; });
      R('cost').textContent = money(cost);
      check(null, cost, nonLabor, hoursPer, pct, fixed, tgt);
      return;
    }
    var price = roundUpHalf((cost + fixed) / denom);
    var fees = price * pct + fixed, profit = price - fees - cost;
    tween(R('price'), price, money);
    R('sub').textContent = (profit / price * 100).toFixed(1) + '% profit after fees and your wage';
    R('cost').textContent = money(cost);
    R('fees').textContent = money(fees);
    R('profit').textContent = money(profit);
    R('hour').textContent = hoursPer > 0 ? money((price - fees - nonLabor) / hoursPer) : '—';
    check(price, cost, nonLabor, hoursPer, pct, fixed, tgt);
  }

  function check(suggested, cost, nonLabor, hoursPer, pct, fixed, tgt) {
    var p = num('#f-now'), v = R('nverdict'), pr = R('nprofit');
    if (!isFinite(p) || p <= 0) {
      ['nfees', 'nprofit', 'nhour'].forEach(function (k) { R(k).textContent = '—'; });
      R('nprofl').textContent = 'Profit';
      v.className = 'verdict'; v.querySelector('span').textContent = 'Type what you charge now to check it.';
      return;
    }
    var fees = p * pct + fixed, profit = p - fees - cost, margin = profit / p;
    R('nfees').textContent = money(fees);
    R('nprofl').textContent = 'Profit (' + (margin * 100).toFixed(1) + '%)';
    pr.textContent = signed(profit);
    R('nhour').textContent = hoursPer > 0 ? money((p - fees - nonLabor) / hoursPer) : '—';
    var msg, cls;
    if (p - fees < nonLabor) { cls = 'bad'; pr.className = 'neg'; msg = 'At this price every sale loses money before you’re paid anything for your time.'; }
    else if (margin + 1e-9 < tgt / 100) {
      cls = 'warn'; pr.className = profit < 0 ? 'neg' : 'mid';
      msg = profit < 0 ? 'Below target — doesn’t cover your full wage.' : 'Below your ' + tgt + '% target.';
      if (suggested) msg += ' ' + money(suggested) + ' would hit it.';
    } else { cls = 'ok'; pr.className = 'pos'; msg = 'This price meets your target.'; }
    v.className = 'verdict ' + cls;
    v.querySelector('span').textContent = msg;
  }

  $$('.seg-ctl button').forEach(function (b) {
    b.addEventListener('click', function () {
      cur = b.getAttribute('data-cur');
      $$('.seg-ctl button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      R('price').removeAttribute('data-v');
      fillChannels(); calc();
    });
  });
  $$('#calc input, #calc select').forEach(function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  fillChannels(); calc();

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

  // ---------- FAQ: smooth open and close ----------
  $$('.faq details').forEach(function (d) {
    var s = d.querySelector('summary'), a = d.querySelector('.ans');
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
