(() => {
  const t0 = performance.now();
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isDesktop = () => window.matchMedia('(min-width:1101px)').matches;

  /* Header shadow + compact logo on scroll */
  const hdr = $('#hdr');
  const onScroll = () => hdr.classList.toggle('is-scrolled', window.scrollY > 60);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  const nav = $('#nav'), burger = $('#burger');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    burger.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    if (!open) closeDrops();
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* Shop + Services dropdowns: closed until tapped (click state is separate from desktop hover) */
  const drops = $$('.nav__item--drop');
  const setDrop = (d, open) => { d.classList.toggle('is-open', open); $('.nav__toggle', d).setAttribute('aria-expanded', open); };
  function closeDrops(except) { drops.forEach(d => { if (d !== except) setDrop(d, false); }); }
  drops.forEach(d => $('.nav__toggle', d).addEventListener('click', ev => {
    ev.stopPropagation();
    const open = !d.classList.contains('is-open');
    closeDrops(d); setDrop(d, open);
  }));
  document.addEventListener('click', ev => { if (isDesktop() && !drops.some(d => d.contains(ev.target))) closeDrops(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeDrops(); });
  window.addEventListener('resize', () => { if (isDesktop()) setMenu(false); });

  /* Reveal on scroll, staggered within a row */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, sibs = $$('.reveal', el.parentElement);
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 4) * 90 + 'ms';
      el.classList.add('is-in'); io.unobserve(el);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* Count up */
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count, start = end > 1000 ? end - 35 : 0, d = 1400, s = performance.now();
      cio.unobserve(el);
      if (reduce) return;
      const step = now => { const p = Math.min((now - s) / d, 1), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(start + (end - start) * e); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* Consultation pop-up */
  const modal = $('#consult');
  let lastFocus = null, autoShown = false;
  try { autoShown = sessionStorage.getItem('tr-consult') === '1'; } catch (e) {}
  const openModal = () => {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    const close = $('.modal__x', modal), first = $('input[name=name]', modal);
    (window.matchMedia('(max-width:640px)').matches ? close : first).focus({ preventScroll: true });
    try { sessionStorage.setItem('tr-consult', '1'); } catch (e) {}
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  $$('[data-consult]').forEach(b => b.addEventListener('click', openModal));
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* Auto pop-up: once per visit, when the visitor first reaches Services */
  const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (!autoShown) {
    const aio = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      aio.disconnect();
      setTimeout(() => {
        if (nav.classList.contains('is-open') || typing() || !modal.hidden) return;
        openModal();
      }, 1200);
    }, { threshold: .35 });
    aio.observe($('#services'));
  }

  /* Forms: honeypot, time trap, validation, friendly messages */
  const BAD = /@(10minutemail|20minutemail|guerrillamail|sharklasers|grr\.la|mailinator|tempmail|temp-mail|yopmail|throwaway|maildrop|fakeinbox|dispostable|trash-mail|getairmail|emailondeck|mytrashmail|mohmal|tempinbox|tempr\.email|example\.|test\.com)/i;
  $$('[data-form]').forEach(form => {
    const msg = $('.form__msg', form), btn = $('button[type=submit]', form);
    const say = (text, ok) => { msg.textContent = text; msg.className = 'form__msg ' + (ok ? 'is-ok' : 'is-err'); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      form.elements.ts.value = Math.round(performance.now() - t0);
      let bad = null;
      $$('[required]', form).forEach(f => { const no = !f.value.trim(); f.classList.toggle('is-bad', no); if (no && !bad) bad = f; });
      const em = form.elements.email;
      if (!bad && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) { em.classList.add('is-bad'); bad = em; }
      if (bad) { say('Please fill in the highlighted fields.'); bad.focus(); return; }
      if (BAD.test(em.value)) { em.classList.add('is-bad'); say('Please use an email address you check, so we can reply.'); return; }
      btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending...'; msg.textContent = '';
      try {
        const r = await fetch('enquiry.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) { form.reset(); say('Thank you! We have your message and will be in touch soon. Need us sooner? Call (888) 336-4412.', true); }
        else say(j.error || 'Something went wrong. Please call (888) 336-4412 or email probowtools@yahoo.com.');
      } catch (err) {
        say('This preview cannot send messages yet. Please call (888) 336-4412 or email probowtools@yahoo.com.');
      } finally { btn.disabled = false; btn.textContent = label; }
    });
  });

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
