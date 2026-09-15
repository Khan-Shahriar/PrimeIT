const mobileToggle = document.querySelector('.mobile-toggle');
const publicNavigation = document.querySelector('#public-navigation');
const topActions = document.querySelector('.top-actions');

function isMobileNavigation() {
  return window.innerWidth <= 1000;
}

function closeMobileNavigation() {
  if (!publicNavigation || !mobileToggle) return;

  publicNavigation.classList.remove('open');
  publicNavigation.style.display = '';
  publicNavigation.style.position = '';
  publicNavigation.style.top = '';
  publicNavigation.style.left = '';
  publicNavigation.style.right = '';
  publicNavigation.style.flexDirection = '';
  publicNavigation.style.padding = '';
  publicNavigation.style.background = '';
  publicNavigation.style.border = '';
  publicNavigation.style.boxShadow = '';
  publicNavigation.style.zIndex = '';

  mobileToggle.setAttribute('aria-expanded', 'false');
  mobileToggle.setAttribute('aria-label', 'Open navigation menu');
}

function openMobileNavigation() {
  if (!publicNavigation || !mobileToggle) return;

  publicNavigation.classList.add('open');
  publicNavigation.style.display = 'flex';
  publicNavigation.style.position = 'absolute';
  publicNavigation.style.top = '76px';
  publicNavigation.style.left = '0';
  publicNavigation.style.right = '0';
  publicNavigation.style.flexDirection = 'column';
  publicNavigation.style.alignItems = 'stretch';
  publicNavigation.style.gap = '4px';
  publicNavigation.style.padding = '12px';
  publicNavigation.style.background = '#fff';
  publicNavigation.style.borderBottom = '1px solid var(--line)';
  publicNavigation.style.boxShadow = '0 18px 35px rgba(11, 16, 32, .08)';
  publicNavigation.style.zIndex = '60';

  mobileToggle.setAttribute('aria-expanded', 'true');
  mobileToggle.setAttribute('aria-label', 'Close navigation menu');
}

function updateNavigationLayout() {
  if (!mobileToggle || !publicNavigation || !topActions) return;

  if (isMobileNavigation()) {
    mobileToggle.style.display = 'block';
    topActions.style.display = 'none';

    if (!publicNavigation.classList.contains('open')) {
      publicNavigation.style.display = 'none';
    }
  } else {
    mobileToggle.style.display = 'none';
    topActions.style.display = 'flex';
    closeMobileNavigation();
    publicNavigation.style.display = 'flex';
  }
}

if (mobileToggle && publicNavigation) {
  mobileToggle.addEventListener('click', () => {
    if (publicNavigation.classList.contains('open')) {
      closeMobileNavigation();
    } else {
      openMobileNavigation();
    }
  });

  publicNavigation.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileNavigation);
  });

  document.addEventListener('click', event => {
    if (!isMobileNavigation()) return;
    if (!publicNavigation.classList.contains('open')) return;
    if (publicNavigation.contains(event.target) || mobileToggle.contains(event.target)) return;

    closeMobileNavigation();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileNavigation();
    }
  });

  window.addEventListener('resize', updateNavigationLayout);
  updateNavigationLayout();
}

document.querySelectorAll('[data-toast]').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.toast || 'Action completed';
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  });
});

document.querySelectorAll('form[data-demo]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = 'Saved ✓';
      setTimeout(() => btn.textContent = old, 1300);
    }
  });
});
