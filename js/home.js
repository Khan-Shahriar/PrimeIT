// ==========================================
// Mobile Navigation
// ==========================================

const mobileToggle = document.querySelector('.mobile-toggle');
const publicNavigation = document.querySelector('#public-navigation');

if (mobileToggle && publicNavigation) {
  mobileToggle.addEventListener('click', () => {
    const isOpen = publicNavigation.classList.toggle('is-open');

    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    mobileToggle.setAttribute(
      'aria-label',
      isOpen ? 'Close navigation menu' : 'Open navigation menu'
    );
  });

  // Close the mobile menu after selecting a navigation link
  publicNavigation.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      publicNavigation.classList.remove('is-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Open navigation menu');
    });
  });
};


// ==========================================
// Existing Toast Functionality
// ==========================================

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


// ==========================================
// Existing Demo Form Functionality
// ==========================================

document.querySelectorAll('form[data-demo]').forEach(form => {

  form.addEventListener('submit', e => {

    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');

    if (btn) {
      const old = btn.textContent;
      btn.textContent = 'Saved ✓';

      setTimeout(() => {
        btn.textContent = old;
      }, 1300);
    }

  });

});