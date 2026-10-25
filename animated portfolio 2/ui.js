(() => {
  'use strict';

  const projects = {
    veloce: { title: 'VELOCE BIKES', category: '01 / E-COMMERCE WEBSITE / CONCEPT', image: 'project-veloce.webp', description: 'A performance-focused bicycle storefront concept. Expressive typography, an immersive product hero, and a clear shopping hierarchy give the product room to lead.', tags: ['Web design', 'E-commerce', 'Art direction'] },
    woodcraft: { title: 'WOODCRAFT', category: '02 / FURNITURE WEBSITE / CONCEPT', image: 'project-woodcraft.webp', description: 'A quiet furniture website concept built around natural materials and thoughtful craftsmanship. Warm neutrals, generous space, and tactile imagery create a considered digital showroom.', tags: ['UI/UX design', 'Visual identity', 'Digital showroom'] },
    urbanic: { title: 'URBANIC', category: '03 / FASHION MAGAZINE / CONCEPT', image: 'project-urbanic.webp', description: 'An editorial fashion concept with a bold point of view. A cinematic black-and-red palette meets confident layouts and expressive imagery for a memorable first impression.', tags: ['Editorial design', 'Fashion', 'Creative direction'] }
  };

  let lastOpener;
  function openDialog(dialog, opener) {
    if (!opener.closest('dialog')) lastOpener = opener;
    document.querySelectorAll('dialog[open]').forEach(item => item.close());
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  document.querySelectorAll('[data-contact]').forEach(button => {
    button.addEventListener('click', () => openDialog(document.querySelector('#contact-dialog'), button));
  });
  document.querySelectorAll('[data-project]').forEach(button => {
    button.addEventListener('click', () => {
      const data = projects[button.dataset.project];
      const dialog = document.querySelector('#project-dialog');
      document.querySelector('#project-title').textContent = data.title;
      document.querySelector('#project-category').textContent = data.category;
      document.querySelector('#project-description').textContent = data.description;
      const image = dialog.querySelector('.dialog-project-image');
      image.src = `./assets/${data.image}`;
      image.alt = `${data.title} website concept`;
      document.querySelector('#project-tags').replaceChildren(...data.tags.map(tag => {
        const item = document.createElement('li');
        item.textContent = tag;
        return item;
      }));
      openDialog(dialog, button);
    });
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
        if (lastOpener?.isConnected) lastOpener.focus({ preventScroll: true });
      }
    });
  });

  const status = document.querySelector('.copy-status');
  let statusTimeout;
  function notify(message) {
    clearTimeout(statusTimeout);
    status.textContent = message;
    status.classList.add('is-visible');
    statusTimeout = setTimeout(() => status.classList.remove('is-visible'), 4500);
  }
  document.querySelector('.copy-link').addEventListener('click', async () => {
    const url = new URL(location.href);
    url.hash = '';
    try {
      await navigator.clipboard.writeText(url.href);
      notify('Portfolio link copied.');
    } catch {
      // A selectable link keeps the action useful on browsers without clipboard access.
      status.replaceChildren(document.createTextNode('Portfolio link: '));
      const link = document.createElement('a');
      link.href = url.href;
      link.textContent = url.href;
      status.append(link);
      status.style.pointerEvents = 'auto';
      status.classList.add('is-visible');
    }
  });
  document.querySelector('#year').textContent = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date());
})();
