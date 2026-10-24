(() => {
  'use strict';

  const menu = document.querySelector('#menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const closeMenu = () => {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a, button')) closeMenu();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  const desktopMenu = window.matchMedia('(min-width: 441px)');
  if (desktopMenu.addEventListener) desktopMenu.addEventListener('change', closeMenu);
  else if (desktopMenu.addListener) desktopMenu.addListener(closeMenu);

  let lastOpener;
  const openDialog = (dialog, opener) => {
    document.querySelectorAll('dialog[open]').forEach(item => item.close());
    if (!opener.closest('dialog')) lastOpener = opener;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  };
  document.querySelectorAll('[data-dialog]').forEach(button => {
    button.addEventListener('click', () => openDialog(document.getElementById(button.dataset.dialog), button));
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) {
        document.body.classList.remove('dialog-open');
        if (lastOpener?.isConnected && !lastOpener.closest('dialog:not([open])')) lastOpener.focus({ preventScroll: true });
      }
    });
  });

  const projects = {
    outer: {
      category: '01 / Brand identity / Concept study',
      title: 'Made for the outside.',
      description: 'An exploration of an outdoor identity built around protection, movement, and everyday utility. A restrained palette lets tactile materials and a confident silhouette do the talking.',
      tags: ['Brand strategy', 'Visual identity', 'Art direction'],
      photo: 'photo-outer',
      alt: 'Black puffer jacket hanging in a monochrome studio'
    },
    sound: {
      category: '02 / Art direction / Concept study',
      title: 'A different frequency.',
      description: 'A visual world for a sound-first lifestyle concept. Expressive portraiture, sculptural hardware, and a quiet graphic language bring the listening experience into focus.',
      tags: ['Creative direction', 'Digital experience', 'Photography concept'],
      photo: 'photo-sound',
      alt: 'Profile portrait wearing silver over-ear headphones'
    },
    ritual: {
      category: '03 / Packaging design / Concept study',
      title: 'Less, but considered.',
      description: 'A minimal skincare packaging exploration inspired by daily rituals. Dark glass, honest textures, and purposeful proportions create a calm, considered presence.',
      tags: ['Packaging design', 'Brand identity', 'Material exploration'],
      photo: 'photo-ritual',
      alt: 'Dark glass skincare bottle on a sculptural stone'
    }
  };
  const projectDialog = document.querySelector('#project-dialog');
  document.querySelectorAll('[data-project]').forEach(button => {
    button.addEventListener('click', () => {
      const project = projects[button.dataset.project];
      document.querySelector('#project-category').textContent = project.category;
      document.querySelector('#project-title').textContent = project.title;
      document.querySelector('#project-description').textContent = project.description;
      const photo = projectDialog.querySelector('.project-dialog-photo');
      photo.className = `project-dialog-photo project-photo ${project.photo}`;
      photo.setAttribute('aria-label', project.alt);
      document.querySelector('#project-tags').replaceChildren(...project.tags.map(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        return span;
      }));
      openDialog(projectDialog, button);
    });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 25px 0px' });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    document.body.classList.add('can-reveal');
  }
})();
