(() => {
  const navToggle = document.querySelector('.mobile-toggle');
  const navigation = document.querySelector('#public-navigation');

  if (navToggle && navigation) {
    navToggle.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navigation.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  const items = [...document.querySelectorAll('.gallery-item')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const emptyState = document.querySelector('#gallery-empty');

  const visibleItems = () => items.filter((item) => !item.hidden);

  filters.forEach((filterButton) => {
    filterButton.addEventListener('click', () => {
      const filter = filterButton.dataset.filter || 'all';

      filters.forEach((button) => {
        const active = button === filterButton;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      items.forEach((item) => {
        const matches = filter === 'all' || item.dataset.category === filter;
        item.hidden = !matches;
      });

      if (emptyState) {
        emptyState.hidden = visibleItems().length > 0;
      }
    });
  });

  const lightbox = document.querySelector('#gallery-lightbox');
  const lightboxImage = document.querySelector('#lightbox-image');
  const lightboxTitle = document.querySelector('#lightbox-title');
  const lightboxCategory = document.querySelector('#lightbox-category');
  const lightboxDescription = document.querySelector('#lightbox-description');
  const closeButtons = lightbox ? [...lightbox.querySelectorAll('[data-lightbox-close]')] : [];
  const previousButton = lightbox?.querySelector('.lightbox-prev');
  const nextButton = lightbox?.querySelector('.lightbox-next');
  const triggers = [...document.querySelectorAll('.gallery-trigger')];

  let currentIndex = 0;
  let lastFocusedElement = null;

  const getGalleryData = (item) => {
    const image = item.querySelector('img');
    const title = item.querySelector('.gallery-copy strong')?.textContent.trim() || '';
    const description = item.querySelector('.gallery-copy > span:last-child')?.textContent.trim() || '';
    const category = item.querySelector('.tag')?.textContent.trim() || '';

    return {
      src: image?.currentSrc || image?.src || '',
      alt: image?.alt || title,
      title,
      description,
      category
    };
  };

  const getOpenItems = () => items.filter((item) => !item.hidden);

  const renderLightbox = (item) => {
    const data = getGalleryData(item);
    if (!lightboxImage) return;

    lightboxImage.src = data.src;
    lightboxImage.alt = data.alt;
    if (lightboxTitle) lightboxTitle.textContent = data.title;
    if (lightboxCategory) lightboxCategory.textContent = data.category;
    if (lightboxDescription) lightboxDescription.textContent = data.description;

    const openItems = getOpenItems();
    const position = openItems.indexOf(item);
    if (previousButton) previousButton.disabled = openItems.length < 2 || position <= 0;
    if (nextButton) nextButton.disabled = openItems.length < 2 || position >= openItems.length - 1;
  };

  const openLightbox = (item) => {
    if (!lightbox) return;

    lastFocusedElement = document.activeElement;
    const openItems = getOpenItems();
    currentIndex = Math.max(0, openItems.indexOf(item));
    renderLightbox(openItems[currentIndex]);

    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-lightbox-open');
    closeButtons[0]?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-lightbox-open');
    if (lightboxImage) {
      lightboxImage.src = '';
      lightboxImage.alt = '';
    }
    lastFocusedElement?.focus?.();
  };

  const moveLightbox = (direction) => {
    const openItems = getOpenItems();
    if (openItems.length < 2) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= openItems.length) return;

    currentIndex = nextIndex;
    renderLightbox(openItems[currentIndex]);
  };

  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', () => {
      const item = items[index];
      if (item && !item.hidden) openLightbox(item);
    });
  });

  closeButtons.forEach((button) => button.addEventListener('click', closeLightbox));
  previousButton?.addEventListener('click', () => moveLightbox(-1));
  nextButton?.addEventListener('click', () => moveLightbox(1));

  document.addEventListener('keydown', (event) => {
    if (!lightbox?.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveLightbox(1);
    }
  });

  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
})();
