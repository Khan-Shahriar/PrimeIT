(() => {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navigation = document.querySelector('#public-navigation');

  if (mobileToggle && navigation) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('is-open');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      mobileToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navigation.classList.remove('is-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  const form = document.querySelector('#contact-inquiry-form');
  if (!form) return;

  const fields = {
    fullName: document.querySelector('#full-name'),
    email: document.querySelector('#email'),
    phone: document.querySelector('#phone'),
    subject: document.querySelector('#subject'),
    message: document.querySelector('#message')
  };

  const status = document.querySelector('#form-status');
  const messageCount = document.querySelector('#message-count');
  const resetButton = document.querySelector('#contact-reset');
  const maxMessageLength = 2000;

  const setError = (field, message) => {
    const error = document.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
  };

  const clearErrors = () => {
    Object.values(fields).forEach((field) => {
      if (field) setError(field, '');
    });
  };

  const validateName = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter your full name.';
    if (trimmed.length < 2) return 'Please enter at least 2 characters.';
    if (trimmed.length > 100) return 'Please keep your name under 100 characters.';
    if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(trimmed)) return 'Please enter a valid name.';
    return '';
  };

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter your email address.';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailPattern.test(trimmed) ? '' : 'Please enter a valid email address.';
  };

  const validatePhone = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return 'Please enter a valid phone number.';
    if (!/^[+()\-\s\d.]+$/.test(trimmed)) return 'Please enter a valid phone number.';
    return '';
  };

  const validateSubject = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter a subject.';
    if (trimmed.length < 3) return 'Please enter at least 3 characters.';
    if (trimmed.length > 160) return 'Please keep the subject under 160 characters.';
    return '';
  };

  const validateMessage = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter your message.';
    if (trimmed.length < 20) return 'Please provide at least 20 characters.';
    if (trimmed.length > maxMessageLength) return `Please keep the message under ${maxMessageLength} characters.`;
    return '';
  };

  const validateForm = () => {
    const errors = {
      fullName: validateName(fields.fullName.value),
      email: validateEmail(fields.email.value),
      phone: validatePhone(fields.phone.value),
      subject: validateSubject(fields.subject.value),
      message: validateMessage(fields.message.value)
    };

    Object.entries(errors).forEach(([key, message]) => {
      setError(fields[key], message);
    });

    return Object.values(errors).every((message) => !message);
  };

  const updateMessageCount = () => {
    const length = fields.message.value.length;
    messageCount.textContent = `${length} / ${maxMessageLength}`;
  };

  const showStatus = (message, type = 'info') => {
    status.textContent = message;
    status.className = `form-status ${type}`;
    status.hidden = false;
  };

  Object.values(fields).forEach((field) => {
    if (!field) return;

    field.addEventListener('blur', () => {
      if (field === fields.fullName) setError(field, validateName(field.value));
      if (field === fields.email) setError(field, validateEmail(field.value));
      if (field === fields.phone) setError(field, validatePhone(field.value));
      if (field === fields.subject) setError(field, validateSubject(field.value));
      if (field === fields.message) setError(field, validateMessage(field.value));
    });

    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        if (field === fields.fullName) setError(field, validateName(field.value));
        if (field === fields.email) setError(field, validateEmail(field.value));
        if (field === fields.phone) setError(field, validatePhone(field.value));
        if (field === fields.subject) setError(field, validateSubject(field.value));
        if (field === fields.message) setError(field, validateMessage(field.value));
      }
    });
  });

  fields.message.addEventListener('input', updateMessageCount);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    clearErrors();

    if (!validateForm()) {
      showStatus('Please correct the highlighted fields before continuing. No message was sent.', 'error');
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    showStatus('Your inquiry passed frontend validation. Backend submission is not connected yet, so no message was sent or stored.', 'info');
  });

  resetButton?.addEventListener('click', () => {
    window.setTimeout(() => {
      clearErrors();
      status.hidden = true;
      updateMessageCount();
    }, 0);
  });

  updateMessageCount();
})();
