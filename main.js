/* Portfolio interactions: scroll reveal, mobile menu, small niceties. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveal ---- */
  const items = [...document.querySelectorAll('.reveal')];
  items.forEach((el, i) => el.style.setProperty('--d', `${Math.min(i * 70, 420)}ms`));

  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  /* ---- mobile menu ---- */
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('menu');

  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
  };

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav') && !e.target.closest('.nav__links')) setMenu(false);
    });
  }


  /* ---- year ---- */
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- pointer parallax on the hero art (desktop, subtle) ---- */
  const art = document.querySelector('.hero__art');
  const hero = document.querySelector('.hero');
  if (art && hero && !reduce && window.matchMedia('(pointer:fine)').matches) {
    let raf = 0;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        art.style.transform = `translate3d(${(-x * 12).toFixed(2)}px, ${(-y * 10).toFixed(2)}px, 0)`;
        raf = 0;
      });
    });
    hero.addEventListener('pointerleave', () => {
      art.style.transform = '';
    });
  }
})();
