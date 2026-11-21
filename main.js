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


  /* ---- tech stack: name readout on hover ---- */
  const stackGrid = document.querySelector('.stack__grid');
  const stackReadout = document.querySelector('.stack__readout');
  if (stackGrid && stackReadout) {
    const show = (name) => {
      stackReadout.textContent = name;
      stackReadout.classList.add('is-on');
    };
    const hide = () => stackReadout.classList.remove('is-on');

    stackGrid.addEventListener('pointerover', (e) => {
      const item = e.target.closest ? e.target.closest('li[data-name]') : null;
      if (item) show(item.dataset.name);
    });
    /* a mouse leaving the grid hides the name; a finger tap keeps it on screen */
    stackGrid.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') hide();
    });
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest || !e.target.closest('.stack__grid')) hide();
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
