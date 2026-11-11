/* Folder — version HTML/JS vanilla (sans React). Usage : Folder(element, options) */
(function () {
  var TAU = Math.PI * 2, STEP = 1 / 240, MAX = 6;
  var FLAP_REST = [{x:.16,rise:0,r:3},{x:-.17,rise:.05,r:-3.5},{x:0,rise:.1,r:.5},{x:.25,rise:.08,r:5},{x:-.25,rise:.09,r:-5.5},{x:.08,rise:.12,r:1.5}];
  var SPREAD_TURN = [4,-5,3,-6,5,-3], SPREAD_DROP = [.03,-.04,.05,-.02,.04,-.05], DROP_TURN = [-6,4,-3,7,-5,3];
  var ANGLES = { open: -64, receive: -30, peek: -15, rest: 0 };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

  var ctx2d = null;
  function parseColor(v) {
    ctx2d = ctx2d || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    ctx2d.clearRect(0, 0, 1, 1); ctx2d.fillStyle = '#3d8bff'; ctx2d.fillStyle = String(v); ctx2d.fillRect(0, 0, 1, 1);
    return Array.from(ctx2d.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }
  var mix = function (c, t, a) { return c.map(function (v, i) { return Math.round(v + (t[i] - v) * a); }); };
  var rgbs = function (c) { return 'rgb(' + c.join(', ') + ')'; };
  var luma = function (c) { return (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255; };

  function backPath(w, h, tabX, tabW, tabH, sh, r) {
    var top = tabH, bot = tabH + h;
    return ['M 0 ' + (top + r), 'Q 0 ' + top + ' ' + r + ' ' + top, 'L ' + (tabX - sh) + ' ' + top,
      'C ' + tabX + ' ' + top + ' ' + tabX + ' 0 ' + (tabX + sh) + ' 0', 'L ' + (tabX + tabW - sh) + ' 0',
      'C ' + (tabX + tabW) + ' 0 ' + (tabX + tabW) + ' ' + top + ' ' + (tabX + tabW + sh) + ' ' + top,
      'L ' + (w - r) + ' ' + top, 'Q ' + w + ' ' + top + ' ' + w + ' ' + (top + r), 'L ' + w + ' ' + (bot - r),
      'Q ' + w + ' ' + bot + ' ' + (w - r) + ' ' + bot, 'L ' + r + ' ' + bot, 'Q 0 ' + bot + ' 0 ' + (bot - r), 'Z'].join(' ');
  }

  function docHtml(item) {
    if (item && typeof item === 'object' && item.image)
      return '<div class="folder-photo"><img src="' + esc(item.image) + '" alt="' + esc(item.alt || item.title) + '" draggable="false"></div>';
    var title = typeof item === 'object' ? item.title : item, desc = item && item.description;
    return '<div class="folder-doc">' + (title ? '<span class="folder-doc-title">' + esc(title) + '</span>' : '<span class="folder-doc-heading"></span>') +
      (desc ? '<span class="folder-doc-text">' + esc(desc) + '</span>' : '') +
      '<span class="folder-doc-line" style="width:92%"></span><span class="folder-doc-line" style="width:84%"></span><span class="folder-doc-line" style="width:88%"></span><span class="folder-doc-block"></span><span class="folder-doc-line" style="width:80%"></span><span class="folder-doc-line" style="width:62%"></span></div>';
  }

  function Folder(root, options) {
    var o = Object.assign({
      items: [{ title: 'Brand guidelines' }, { title: 'Launch plan' }, { title: 'Moodboard' }], label: '', variant: 'solid',
      color: '#3d8bff', paperColor: '#ffffff', tabPosition: 'right', layout: 'spread', size: 1, openOn: 'click', defaultOpen: false,
      draggable: true, zoomOnClick: true, peek: true, intro: true, tilt: .5, bounce: .4, speed: 1, frost: .25,
      closeOnOutsideClick: true, theme: 'dark', onItemClick: null, onItemDrop: null, onOpenChange: null
    }, options || {});
    var entries = (o.items && o.items.length ? o.items : []).slice(0, MAX), n = entries.length;
    var s = Math.max(.3, Number(o.size) || 1), speed = clamp(o.speed, .2, 3), bounce = clamp(o.bounce, 0, 1), tilt = clamp(o.tilt, 0, 1.5);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var w = 224 * s, h = 176 * s, tabH = 20 * s, r = 12 * s, sh = tabH * .75;
    var frontTop = tabH + h * .3, frontH = tabH + h - frontTop, docW = w * .54, docH = docW * 1.22;
    var tabX = 0, tabW = 0;

    var rgb = parseColor(o.color), paper = parseColor(o.paperColor), backTone = mix(rgb, [0, 0, 0], .16);
    var vars = {
      '--folder-rgb': rgb.join(', '), '--folder-base': rgbs(rgb), '--folder-front-top': rgbs(mix(rgb, [255,255,255], .12)),
      '--folder-front-bottom': rgbs(mix(rgb, [0,0,0], .06)), '--folder-inside-top': rgbs(mix(rgb, [0,0,0], .08)), '--folder-inside-bottom': rgbs(backTone),
      '--folder-tab-ink': luma(backTone) > .6 ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.92)', '--folder-paper': rgbs(paper),
      '--folder-paper-ink': rgbs(mix(paper, [0,0,0], .11)), '--folder-paper-ink-strong': rgbs(mix(paper, [0,0,0], .28)), '--folder-paper-text': rgbs(mix(paper, [0,0,0], .72)),
      '--folder-w': w + 'px', '--folder-h': h + 'px', '--folder-tab-h': tabH + 'px', '--folder-front-h': frontH + 'px', '--folder-r': r + 'px',
      '--folder-doc-w': docW + 'px', '--folder-doc-h': docH + 'px', '--folder-frost': (1.5 + clamp(o.frost, 0, 1) * 10) * s + 'px', '--folder-scale': s
    };
    root.className = 'folder-root'; root.dataset.variant = o.variant; root.dataset.theme = o.theme === 'light' ? 'light' : 'dark';
    if (o.draggable) root.dataset.draggable = '';
    Object.keys(vars).forEach(function (k) { root.style.setProperty(k, vars[k]); });
    root.innerHTML = '<div class="folder-stage" role="button" tabindex="0" aria-expanded="false" aria-label="' + esc(o.label ? o.label + ' folder' : 'Folder') + '">' +
      '<span class="folder-layer folder-ground" aria-hidden="true"></span>' +
      '<div class="folder-layer folder-back" aria-hidden="true"><div class="folder-back-fill"></div>' + (o.label ? '<span class="folder-tab-text">' + esc(o.label) + '</span>' : '') + '</div>' +
      entries.map(function (e, i) { return '<div class="folder-layer folder-item" data-i="' + i + '" tabindex="-1">' + docHtml(e) + '</div>'; }).join('') +
      '<div class="folder-layer folder-front" aria-hidden="true"><div class="folder-face"></div></div></div>' +
      (o.label ? '<span class="folder-tab-text folder-measure" aria-hidden="true">' + esc(o.label) + '</span>' : '');
    var $ = function (sel) { return root.querySelector(sel); };
    var stage = $('.folder-stage'), ground = $('.folder-ground'), back = $('.folder-back'), fill = $('.folder-back-fill'), tabText = back.querySelector('.folder-tab-text'),
      frontEl = $('.folder-front'), measure = $('.folder-measure'), nodes = Array.from(root.querySelectorAll('.folder-item'));

    function layoutTab() {
      var maxTab = w - 2 * r - 2 * sh - 10 * s, lw = measure ? measure.offsetWidth : 0;
      tabW = clamp(o.label ? lw + 14 * s + sh : w * .34, Math.min(w * .3, maxTab), maxTab);
      tabX = o.tabPosition === 'left' ? r + 5 * s + sh : o.tabPosition === 'center' ? (w - tabW) / 2 : w - r - 5 * s - sh - tabW;
      fill.style.clipPath = "path('" + backPath(w, h, tabX, tabW, tabH, sh, r) + "')";
      if (tabText) { tabText.style.left = tabX + 'px'; tabText.style.width = tabW + 'px'; }
    }
    layoutTab();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTab);

    /* ---------- état & ressorts ---------- */
    var sp = function (v) { return { v: v, vel: 0 }; };
    var snap = function (p, v) { p.v = v; p.vel = 0; };
    function integrate(p, target, omega, zeta, dt) {
      var k = omega * omega, d = 2 * zeta * omega, steps = Math.max(1, Math.ceil(dt / STEP)), st = dt / steps;
      for (var i = 0; i < steps; i++) { p.vel += (k * (target - p.v) - d * p.vel) * st; p.v += p.vel * st; }
      return Math.abs(target - p.v) > .01 || Math.abs(p.vel) > .01;
    }
    var open = !!o.defaultOpen, hovered = false, pressed = false, pointerX = 0, pointerY = 0, hoveredItem = -1, focus = -1, drag = null;
    var receiveUntil = 0, suppress = false, raf = 0, last = 0, phase = 'rest', previous = 'rest', changedAt = 0, ready = false, dropCount = 0, deskX = 0, deskY = 0;
    var introState = o.intro && !reduce && !open ? 'wait' : 'done', introStart = 0, appear = 1;
    var front = sp(0), rx = sp(0), ry = sp(0), lift = sp(0), squash = sp(1);
    var its = entries.map(function () { return { x: sp(0), y: sp(0), r: sp(0), s: sp(1), hover: sp(0), alpha: sp(1), place: 'in', rank: 0, layer: 'in', elevated: false, outX: 0, outY: 0, outR: 0, outS: 1, outOrder: 0 }; });
    var focusScale = clamp(((tabH + h) * 1.18) / docH, 1.2, 2.2), focusY = tabH + h * .36;

    function slot(rank, count, ph) {
      var rest = FLAP_REST[rank] || FLAP_REST[5], floor = tabH + h - 5 * s - docH / 2, mid = (count - 1) / 2;
      if (ph === 'open') {
        var lift0 = tabH - h * .02, gap, fit, step;
        if (o.layout === 'stack') {
          var strip = Math.min(30 * s, (h * .62) / Math.max(1, count - 1)); fit = 1.04 - rank * .05;
          return { x: w / 2, y: tabH + h * .1 - rank * strip - (docH * (1.04 - fit)) / 2, r: 0, s: fit };
        }
        gap = 12 * s; fit = Math.min(.94, (w * 2.3 - gap * (count - 1)) / (count * docW)); step = docW * fit + gap;
        var tidy = o.layout === 'row';
        return { x: w / 2 + (rank - mid) * step, y: lift0 + (tidy ? 0 : SPREAD_DROP[rank] * h * .7), r: tidy ? 0 : SPREAD_TURN[rank] * .55, s: fit };
      }
      var part = ph === 'receive' ? 1.7 : ph === 'peek' ? 1.3 : 1, x = w / 2 + rest.x * w * part;
      if (ph === 'rest') return { x: x, y: floor - rest.rise * h, r: rest.r, s: 1 };
      var pointer = hovered ? ((pointerX + 1) / 2) * w : null;
      var near = ph === 'peek' && pointer != null ? Math.max(0, 1 - Math.abs(pointer - x) / (w * .32)) : 0;
      var rise = rest.rise + (ph === 'receive' ? .03 : .1);
      return { x: x, y: floor - rise * h - near * near * h * .09, r: rest.r * 1.6, s: 1 };
    }
    var introPose = function (it, sl) { return { x: sl.x, y: sl.y - (h * .8 + docH * .5), r: sl.r + (it.rank % 2 ? 9 : -7), s: sl.s }; };

    var toDesk = function (cx, cy) { var b = root.getBoundingClientRect(); return [(cx - b.left) * root.offsetWidth / (b.width || 1), (cy - b.top) * root.offsetHeight / (b.height || 1)]; };
    var overFolder = function (x, y) { return x >= 0 && x <= w && y >= 0 && y <= tabH + h; };
    var inPocket = function (it) { var hh = (docH * it.s.v) / 2, hw = (docW * it.s.v) / 2; return front.v >= -45 && it.y.v + hh > frontTop + 4 * s && it.x.v + hw > 0 && it.x.v - hw < w; };
    var dragVel = function () { var sm = drag && drag.samples; if (!sm || sm.length < 2) return [0, 0]; var a = sm[0], b = sm[sm.length - 1], d = Math.max(.016, (b[0] - a[0]) / 1000); return [(b[1] - a[1]) / d, (b[2] - a[2]) / d]; };

    function frame(now) {
      raf = 0;
      var t = now / 1000, dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
      var zeta = reduce ? 1 : 1 - .72 * bounce, fo = TAU * 2 * speed, io = TAU * 2.1 * speed, so = TAU * 1.6 * speed;
      var ph = open ? 'open' : (t < receiveUntil ? 'receive' : (o.peek && hovered && !(drag && drag.active) ? 'peek' : 'rest'));
      if (ph !== phase) { previous = phase; phase = ph; changedAt = now; }
      var el = (now - changedAt) / 1000, busy = t < receiveUntil;

      if (introState === 'wait') { root.style.opacity = '0'; last = 0; return; }
      var ranks = []; its.forEach(function (it, i) { if (it.place === 'in') ranks.push(i); });
      var inside = ranks.length; ranks.forEach(function (i, k) { its[i].rank = k; });
      if (focus >= 0 && phase !== 'open' && its[focus].place === 'in') focus = -1;

      var staged = introState === 'run', it0 = staged ? t - introStart : 0;
      var closeAt = (.16 + inside * .085 + .3) / speed, holding = staged && it0 < closeAt;
      var dropAt = function (rank) { return (.16 + (inside - 1 - rank) * .085) / speed; };
      if (staged) { busy = true; if (open || (drag && drag.active)) introState = 'done'; else if (it0 > closeAt + 1 / speed) introState = 'done'; }
      appear = staged ? clamp(it0 / (.34 / speed), 0, 1) : 1; appear = 1 - Math.pow(1 - appear, 3);
      staged = introState === 'run';

      var closing = previous === 'open' && phase !== 'open';
      var frontDelay = closing && !reduce ? (.06 + .035 * inside) / speed : 0;
      var frontTarget = holding ? -42 : ANGLES[el < frontDelay ? previous : phase];

      if (!ready) {
        ready = true; snap(front, frontTarget);
        its.forEach(function (it) { var sl = slot(it.rank, inside, phase), tg = staged ? introPose(it, sl) : sl;
          snap(it.x, tg.x); snap(it.y, tg.y); snap(it.r, tg.r); snap(it.s, tg.s); snap(it.alpha, staged ? 0 : 1); });
      }
      busy = integrate(front, frontTarget, fo, zeta, dt) || busy;
      if (front.v > 0) { front.v = -front.v; front.vel = -front.vel * (.2 + .35 * bounce); }
      if (el < frontDelay) busy = true;
      var engaged = hovered && !reduce;
      busy = integrate(rx, engaged ? -pointerY * 8 * tilt : 0, so, 1, dt) || busy;
      busy = integrate(ry, engaged ? pointerX * 10 * tilt : 0, so, 1, dt) || busy;
      busy = integrate(lift, hovered && phase !== 'open' ? 1 : 0, so, 1, dt) || busy;
      busy = integrate(squash, pressed ? .975 : 1, TAU * 3.2, .6, dt) || busy;

      var opening = phase === 'open' && previous !== 'open', dr = drag && drag.active ? drag : null;
      its.forEach(function (it, i) {
        var tg, om = io, dm = zeta, lf = 0, fade = 1;
        if (focus === i) { tg = { x: w / 2, y: focusY, r: 0, s: focusScale }; lf = 2.4; it.layer = 'focus'; }
        else if (dr && dr.index === i) {
          tg = { x: deskX + dr.grabX, y: deskY + dr.grabY, r: clamp(dragVel()[0] * .012, -14, 14), s: dr.scale * 1.05 };
          om = TAU * 5; dm = .78; lf = 1.4; if (!it.elevated && !inPocket(it)) it.elevated = true; it.layer = it.elevated ? 'drag' : 'in';
        } else if (it.place === 'out') { tg = { x: it.outX, y: it.outY, r: it.outR, s: it.outS }; lf = hoveredItem === i ? 1 : .15; it.layer = 'out'; }
        else {
          var delay = reduce ? 0 : opening ? (.05 + it.rank * .045) / speed : (it.rank * .03) / speed;
          var act = el >= delay ? phase : previous; tg = slot(it.rank, inside, act); if (el < delay) busy = true;
          it.layer = 'in';
          if (staged && it0 < dropAt(it.rank)) { tg = introPose(it, tg); fade = 0; }
          else { it.elevated = false;
            if (act === 'open') { if (hoveredItem === i) { tg = { x: tg.x, y: tg.y - 6 * s, r: tg.r * .2, s: tg.s * 1.05 }; lf = 1; } else lf = .2; } }
        }
        busy = integrate(it.x, tg.x, om, dm, dt) || busy; busy = integrate(it.y, tg.y, om, dm, dt) || busy;
        if (it.layer === 'in') {
          var a = (it.r.v * Math.PI) / 180, reach = ((docW * Math.abs(Math.sin(a)) + docH * Math.abs(Math.cos(a))) * it.s.v) / 2, fl = tabH + h - 2 * s - reach;
          if (it.y.v > fl) { it.y.v = fl; if (it.y.vel > 0) it.y.vel *= -.25; }
        }
        busy = integrate(it.r, tg.r, om, dm, dt) || busy; busy = integrate(it.s, tg.s, io, zeta, dt) || busy;
        busy = integrate(it.hover, lf, io, zeta, dt) || busy; busy = integrate(it.alpha, fade, TAU * 3 * speed, 1, dt) || busy;
      });
      write();
      if (busy || dr) raf = requestAnimationFrame(frame); else last = 0;
    }

    function write() {
      var px = w / 2, py = tabH + h / 2, theta = front.v, a = (theta * Math.PI) / 180;
      var zoom = (1 + lift.v * .012) * squash.v * (.94 + .06 * appear);
      root.style.opacity = appear < .999 ? appear.toFixed(3) : '';
      var desk = 'translate3d(' + px + 'px,' + py + 'px,0) rotateX(' + rx.v + 'deg) rotateY(' + ry.v + 'deg) scale(' + zoom + ') translate3d(' + -px + 'px,' + -py + 'px,0)';
      back.style.transform = desk;
      back.style.setProperty('--folder-label', (1 - clamp((-theta - 18) / 26, 0, 1)).toFixed(3));
      frontEl.style.transform = desk + ' translate3d(0,' + (tabH + h) + 'px,' + 2 * s + 'px) rotateX(' + theta + 'deg) translate3d(0,' + -frontH + 'px,0)';
      var light = (Math.sin(a) * .5 + Math.cos(a) * .86) / .86;
      frontEl.style.setProperty('--folder-glint', clamp((light - 1) * .9, 0, .18).toFixed(3));
      frontEl.style.setProperty('--folder-dim', clamp((1 - light) * .22, 0, .5).toFixed(3));
      ground.style.transform = desk + ' translate3d(0,' + (tabH + h) + 'px,0)';
      ground.style.opacity = (.75 + lift.v * .25).toFixed(3);
      var outs = its.map(function (it, i) { return [it, i]; }).filter(function (p) { return p[0].layer === 'out'; }).sort(function (A, B) { return A[0].outOrder - B[0].outOrder; }).map(function (p) { return p[1]; });
      its.forEach(function (it, i) {
        var z = 3 * s + it.hover.v * 26 * s, layer = 10 + n - it.rank;
        if (it.layer === 'in' && phase === 'open' && hoveredItem === i) layer = 30;
        if (it.layer === 'out') layer = 50 + outs.indexOf(i);
        if (it.layer === 'drag') layer = 80; if (it.layer === 'focus') layer = 90;
        var node = nodes[i];
        node.style.transform = desk + ' translate3d(' + it.x.v + 'px,' + it.y.v + 'px,' + z + 'px) rotate(' + it.r.v + 'deg) scale(' + it.s.v + ') translate(' + -docW / 2 + 'px,' + -docH / 2 + 'px)';
        node.style.zIndex = layer;
        node.style.setProperty('--folder-lift', clamp(it.hover.v, 0, 2.4).toFixed(3));
        node.style.opacity = it.alpha.v < .995 ? Math.max(0, it.alpha.v).toFixed(3) : '';
        var inter = open || it.place === 'out' || focus === i; node.tabIndex = inter ? 0 : -1; if (inter) node.setAttribute('role', 'button'); else node.removeAttribute('role');
      });
    }

    var wake = function () { if (!raf) raf = requestAnimationFrame(frame); };
    function setOpen(v) { if (v === open) return; open = v; stage.setAttribute('aria-expanded', v); if (v) root.setAttribute('data-open', ''); else root.removeAttribute('data-open'); if (o.onOpenChange) o.onOpenChange(v); wake(); }
    if (open) root.setAttribute('data-open', '');

    /* ---------- interactions ---------- */
    function onMove(e) {
      if (drag && e.pointerId === drag.id) {
        var p = toDesk(e.clientX, e.clientY); deskX = p[0]; deskY = p[1];
        var now = performance.now(); drag.samples.push([now, p[0], p[1]]);
        while (drag.samples.length > 2 && now - drag.samples[0][0] > 100) drag.samples.shift();
        if (!drag.active && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > (e.pointerType === 'touch' ? 8 : 4)) {
          var it = its[drag.index]; drag.active = true; drag.grabX = it.x.v - drag.downX; drag.grabY = it.y.v - drag.downY;
          drag.scale = it.place === 'out' ? it.outS : it.s.v; suppress = true; if (focus === drag.index) focus = -1;
          it.elevated = it.place === 'out' || !inPocket(it); root.setAttribute('data-dragging', '');
        }
        if (drag.active) wake();
      }
      if (e.pointerType === 'touch') return;
      var b = root.getBoundingClientRect();
      pointerX = clamp(((e.clientX - b.left) / b.width) * 2 - 1, -1.5, 1.5); pointerY = clamp(((e.clientY - b.top) / b.height) * 2 - 1, -1.5, 1.5);
      var tg = e.target.closest && e.target.closest('[data-i]'); hoveredItem = tg && root.contains(tg) ? Number(tg.dataset.i) : -1;
      if (!hovered) { hovered = true; if (o.openOn === 'hover') setOpen(true); }
      wake();
    }
    function onLeave(e) { if (e.pointerType === 'touch' || (drag && drag.active)) return; hovered = false; pressed = false; hoveredItem = -1; if (o.openOn === 'hover') setOpen(false); wake(); }
    function onDown(e) {
      if (e.button > 0) return; suppress = false;
      var tg = e.target.closest && e.target.closest('[data-i]');
      if (tg && root.contains(tg) && o.draggable) {
        var p = toDesk(e.clientX, e.clientY); deskX = p[0]; deskY = p[1];
        drag = { index: Number(tg.dataset.i), id: e.pointerId, cx: e.clientX, cy: e.clientY, downX: p[0], downY: p[1], grabX: 0, grabY: 0, scale: 1, active: false, samples: [[performance.now(), p[0], p[1]]] };
        try { tg.setPointerCapture(e.pointerId); } catch (_) {}
      } else pressed = true;
      wake();
    }
    function drop(d, cancelled) {
      var it = its[d.index]; delete root.dataset.dragging; root.removeAttribute('data-dragging'); if (!it) return;
      var v = cancelled ? [0, 0] : dragVel();
      if (overFolder(deskX, deskY)) {
        if ((it.place === 'out' || it.elevated) && !reduce) receiveUntil = performance.now() / 1000 + .38 / speed;
        it.place = 'in'; it.elevated = false; if (o.onItemDrop) o.onItemDrop(entries[d.index], d.index, true); return;
      }
      var b = root.getBoundingClientRect(), kx = root.offsetWidth / (b.width || 1), ky = root.offsetHeight / (b.height || 1);
      var hw = (docW * d.scale) / 2 * 1.08 + 8 * s, hh = (docH * d.scale) / 2 * 1.08 + 8 * s;
      var L = -b.left * kx + hw, R = (innerWidth - b.left) * kx - hw, T = -b.top * ky + hh, B = (innerHeight - b.top) * ky - hh;
      it.place = 'out'; it.elevated = true;
      it.outX = clamp(deskX + d.grabX + clamp(v[0], -2400, 2400) * .09, L, Math.max(L, R));
      it.outY = clamp(deskY + d.grabY + clamp(v[1], -2400, 2400) * .09, T, Math.max(T, B));
      it.outR = clamp(it.r.v * .5 + clamp(v[0], -2400, 2400) * .003 + DROP_TURN[d.index % 6] * .6, -12, 12); it.outS = d.scale; it.outOrder = ++dropCount;
      if (o.onItemDrop) o.onItemDrop(entries[d.index], d.index, false);
    }
    function onUp(e) {
      pressed = false;
      if (drag && e.pointerId === drag.id) { var d = drag; drag = null; if (d.active) drop(d, e.type === 'pointercancel'); }
      wake();
    }
    function onDocDown(e) { if (root.contains(e.target)) return; if (focus >= 0) { focus = -1; wake(); } if (open && o.closeOnOutsideClick) setOpen(false); }
    function onKey(e) { if (e.key !== 'Escape') return; if (focus >= 0) { focus = -1; wake(); return; } if (open && o.closeOnOutsideClick) setOpen(false); }
    function toggle() { if (focus >= 0) { focus = -1; wake(); return; } if (o.openOn === 'hover') return; setOpen(!open); }
    function select(i) { if (o.zoomOnClick) focus = focus === i ? -1 : i; if (o.onItemClick) o.onItemClick(entries[i], i); wake(); }

    stage.addEventListener('click', toggle);
    stage.addEventListener('keydown', function (e) { if (e.target === stage && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
    nodes.forEach(function (node, i) {
      node.addEventListener('click', function (e) {
        if (suppress) { suppress = false; e.stopPropagation(); return; }
        if (!(open || its[i].place === 'out' || focus === i)) return;
        e.stopPropagation(); select(i);
      });
      node.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && (open || its[i].place === 'out' || focus === i)) { e.preventDefault(); e.stopPropagation(); select(i); } });
    });
    root.addEventListener('pointermove', onMove); root.addEventListener('pointerleave', onLeave); root.addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
    document.addEventListener('pointerdown', onDocDown); document.addEventListener('keydown', onKey);

    var io2 = null;
    function beginIntro() { if (introState !== 'wait') return; introState = 'run'; introStart = performance.now() / 1000; wake(); }
    if (introState === 'wait') {
      root.style.opacity = '0';
      if (!('IntersectionObserver' in window)) beginIntro();
      else { io2 = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io2.disconnect(); beginIntro(); } }, { threshold: .2 }); io2.observe(root); }
    }
    wake();

    return {
      open: function () { setOpen(true); }, close: function () { setOpen(false); }, toggle: function () { setOpen(!open); },
      destroy: function () {
        cancelAnimationFrame(raf); if (io2) io2.disconnect();
        removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
        document.removeEventListener('pointerdown', onDocDown); document.removeEventListener('keydown', onKey); root.innerHTML = '';
      }
    };
  }
  window.Folder = Folder;
})();
