document.addEventListener('DOMContentLoaded', () => {
  // Mobile Burger Menu Toggle
  const burger = document.querySelector('.mobile-burger');
  const overlay = document.querySelector('.mobile-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-sign-in');

  function openMenu() {
    if (!burger) return;
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    if (!burger) return;
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  if (burger) {
    burger.addEventListener('click', () => {
      const isOpen = burger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) {
      closeMenu();
    }
  });

  // Ease Out Cubic function
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Stats Count-Up Animation
  const statItems = document.querySelectorAll('.stat-item');

  function animateStat(item, index) {
    const target = parseFloat(item.getAttribute('data-target') || '0');
    const suffix = item.getAttribute('data-suffix') || '';
    const decimals = parseInt(item.getAttribute('data-decimals') || '0', 10);
    const valElem = item.querySelector('.stat-val');
    if (!valElem) return;

    const duration = 1500 + index * 80;
    const startDelay = 480 + index * 90;

    setTimeout(() => {
      let startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        const current = eased * target;

        valElem.textContent = current.toFixed(decimals) + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          valElem.textContent = target.toFixed(decimals) + suffix;
        }
      }

      requestAnimationFrame(step);
    }, startDelay);
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          statItems.forEach((item, i) => animateStat(item, i));
          obs.disconnect();
        }
      });
    },
    { threshold: 0.25 }
  );

  const statsFooter = document.querySelector('.stats-footer');
  if (statsFooter) {
    observer.observe(statsFooter);
  } else {
    statItems.forEach((item, i) => animateStat(item, i));
  }
});
