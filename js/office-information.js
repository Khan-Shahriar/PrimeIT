(() => {
    'use strict';

    const statusRegion = document.querySelector('#office-information-status');
    const content = document.querySelector('#office-information-content');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const sidebar = document.querySelector('#member-sidebar');

    const sectionElements = {
        overview: {
            section: document.querySelector('#office-overview-section'),
            container: document.querySelector('#office-overview')
        },
        contact: {
            section: document.querySelector('#office-contact-section'),
            container: document.querySelector('#office-contact')
        },
        hours: {
            section: document.querySelector('#office-hours-section'),
            container: document.querySelector('#office-hours')
        },
        departments: {
            section: document.querySelector('#office-departments-section'),
            container: document.querySelector('#office-departments')
        },
        policies: {
            section: document.querySelector('#office-policies-section'),
            container: document.querySelector('#office-policies')
        },
        importantContacts: {
            section: document.querySelector('#office-contacts-section'),
            container: document.querySelector('#office-important-contacts')
        },
        resources: {
            section: document.querySelector('#office-resources-section'),
            container: document.querySelector('#office-resources')
        }
    };

    function setStatus(type, title, message, retry = false) {
        if (!statusRegion) return;

        const icon = type === 'loading' ? '…' : type === 'error' ? '!' : 'i';
        const retryButton = retry
            ? '<button class="status-retry" type="button" data-office-retry>Try again</button>'
            : '';

        statusRegion.innerHTML = `
            <div class="status-card ${type}">
                <div class="status-content">
                    <span class="status-icon" aria-hidden="true">${icon}</span>
                    <div>
                        <p class="status-title">${escapeHtml(title)}</p>
                        <p class="status-message">${escapeHtml(message)}</p>
                    </div>
                </div>
                ${retryButton}
            </div>
        `;

        const retryButton = statusRegion.querySelector('[data-office-retry]');
        retryButton?.addEventListener('click', loadOfficeInformation);
    }

    function setLoadingState() {
        if (content) content.hidden = true;

        if (!statusRegion) return;

        statusRegion.innerHTML = `
            <div class="status-card loading" role="status" aria-live="polite">
                <div class="status-content">
                    <span class="status-icon" aria-hidden="true">…</span>
                    <div class="loading-stack" aria-hidden="true">
                        <div class="skeleton"></div>
                        <div class="skeleton"></div>
                        <div class="skeleton"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function setEmptyState() {
        if (content) content.hidden = true;
        setStatus(
            'empty',
            'Office information is currently unavailable.',
            'Approved office information will appear here when it is available.'
        );
    }

    function setErrorState() {
        if (content) content.hidden = true;
        setStatus(
            'error',
            'Unable to load office information.',
            'Please try again. If the problem continues, contact the appropriate office administrator.',
            true
        );
    }

    function showContent() {
        if (statusRegion) statusRegion.innerHTML = '';
        if (content) content.hidden = false;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function normalizeText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function isNonEmptyArray(value) {
        return Array.isArray(value) && value.length > 0;
    }

    function clearRenderedSections() {
        Object.values(sectionElements).forEach(({ section, container }) => {
            if (section) section.hidden = true;
            if (container) container.innerHTML = '';
        });
    }

    function renderOverview(overview) {
        const target = sectionElements.overview;
        if (!target?.section || !target.container || !overview) return false;

        const name = normalizeText(overview.name);
        const description = normalizeText(overview.description);
        const status = normalizeText(overview.status);

        if (!name && !description && !status) return false;

        target.container.innerHTML = `
            ${name ? `<h3>${escapeHtml(name)}</h3>` : ''}
            ${description ? `<p>${escapeHtml(description)}</p>` : ''}
            ${status ? `<div class="information-meta">Office status: ${escapeHtml(status)}</div>` : ''}
        `;

        target.section.hidden = false;
        return true;
    }

    function createInformationCard(title, value, options = {}) {
        const safeTitle = escapeHtml(title);
        const safeValue = escapeHtml(value);

        if (options.href) {
            const safeHref = escapeHtml(options.href);
            return `
                <article class="information-card">
                    <h3>${safeTitle}</h3>
                    <p><a href="${safeHref}"${options.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${safeValue}</a></p>
                    ${options.meta ? `<div class="information-meta">${escapeHtml(options.meta)}</div>` : ''}
                </article>
            `;
        }

        return `
            <article class="information-card">
                <h3>${safeTitle}</h3>
                <p>${safeValue}</p>
                ${options.meta ? `<div class="information-meta">${escapeHtml(options.meta)}</div>` : ''}
            </article>
        `;
    }

    function renderContact(contact) {
        const target = sectionElements.contact;
        if (!target?.section || !target.container || !contact || typeof contact !== 'object') return false;

        const cards = [];

        const email = normalizeText(contact.email);
        if (email) cards.push(createInformationCard('Email', email, { href: `mailto:${email}` }));

        const phone = normalizeText(contact.phone);
        if (phone) {
            const phoneHref = phone.replace(/[^\d+]/g, '');
            cards.push(createInformationCard('Phone', phone, { href: `tel:${phoneHref}` }));
        }

        const address = normalizeText(contact.address);
        if (address) cards.push(createInformationCard('Address', address));

        const website = normalizeText(contact.website);
        if (website) {
            const normalizedWebsite = /^https?:\/\//i.test(website) ? website : `https://${website}`;
            cards.push(createInformationCard('Website', website, {
                href: normalizedWebsite,
                external: true
            }));
        }

        if (!cards.length) return false;

        target.container.innerHTML = cards.join('');
        target.section.hidden = false;
        return true;
    }

    function renderHours(hours) {
        const target = sectionElements.hours;
        if (!target?.section || !target.container || !isNonEmptyArray(hours)) return false;

        const rows = hours
            .filter(item => item && typeof item === 'object')
            .map(item => {
                const day = normalizeText(item.day);
                const time = normalizeText(item.time) || normalizeText(item.hours);
                if (!day && !time) return '';
                return `
                    <div class="hours-row">
                        <span class="hours-day">${escapeHtml(day || 'Schedule')}</span>
                        <span class="hours-time">${escapeHtml(time || 'Not specified')}</span>
                    </div>
                `;
            })
            .filter(Boolean);

        if (!rows.length) return false;

        target.container.innerHTML = rows.join('');
        target.section.hidden = false;
        return true;
    }

    function renderDepartments(departments) {
        const target = sectionElements.departments;
        if (!target?.section || !target.container || !isNonEmptyArray(departments)) return false;

        const cards = departments
            .filter(item => item && typeof item === 'object')
            .map(item => {
                const name = normalizeText(item.name);
                const description = normalizeText(item.description);
                const contact = normalizeText(item.contact);

                if (!name && !description && !contact) return '';

                return `
                    <article class="information-card">
                        ${name ? `<h3>${escapeHtml(name)}</h3>` : ''}
                        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                        ${contact ? `<div class="information-meta">${escapeHtml(contact)}</div>` : ''}
                    </article>
                `;
            })
            .filter(Boolean);

        if (!cards.length) return false;

        target.container.innerHTML = cards.join('');
        target.section.hidden = false;
        return true;
    }

    function renderPolicies(policies) {
        const target = sectionElements.policies;
        if (!target?.section || !target.container || !isNonEmptyArray(policies)) return false;

        const items = policies
            .map((item, index) => {
                const policy = typeof item === 'string'
                    ? { title: item, description: '' }
                    : item;

                if (!policy || typeof policy !== 'object') return '';

                const title = normalizeText(policy.title) || normalizeText(policy.name);
                const description = normalizeText(policy.description) || normalizeText(policy.text);

                if (!title && !description) return '';

                return `
                    <article class="policy-item">
                        <span class="policy-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
                        <div>
                            ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
                            ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                        </div>
                    </article>
                `;
            })
            .filter(Boolean);

        if (!items.length) return false;

        target.container.innerHTML = items.join('');
        target.section.hidden = false;
        return true;
    }

    function renderImportantContacts(contacts) {
        const target = sectionElements.importantContacts;
        if (!target?.section || !target.container || !isNonEmptyArray(contacts)) return false;

        const cards = contacts
            .filter(item => item && typeof item === 'object')
            .map(item => {
                const name = normalizeText(item.name);
                const role = normalizeText(item.role);
                const email = normalizeText(item.email);
                const phone = normalizeText(item.phone);

                if (!name && !role && !email && !phone) return '';

                const contactDetails = [
                    role ? escapeHtml(role) : '',
                    email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '',
                    phone ? `<a href="tel:${escapeHtml(phone.replace(/[^\d+]/g, ''))}">${escapeHtml(phone)}</a>` : ''
                ].filter(Boolean).join('<br>');

                return `
                    <article class="information-card">
                        ${name ? `<h3>${escapeHtml(name)}</h3>` : ''}
                        <p>${contactDetails}</p>
                    </article>
                `;
            })
            .filter(Boolean);

        if (!cards.length) return false;

        target.container.innerHTML = cards.join('');
        target.section.hidden = false;
        return true;
    }

    function renderResources(resources) {
        const target = sectionElements.resources;
        if (!target?.section || !target.container || !isNonEmptyArray(resources)) return false;

        const links = resources
            .filter(item => item && typeof item === 'object')
            .map(item => {
                const title = normalizeText(item.title) || normalizeText(item.name);
                const description = normalizeText(item.description);
                const url = normalizeText(item.url);

                if (!title || !url) return '';

                const href = /^https?:\/\//i.test(url) ? url : url;

                return `
                    <a class="resource-link" href="${escapeHtml(href)}"${/^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>
                        <span class="resource-content">
                            <strong>${escapeHtml(title)}</strong>
                            ${description ? `<span>${escapeHtml(description)}</span>` : ''}
                        </span>
                        <span class="resource-arrow" aria-hidden="true">→</span>
                    </a>
                `;
            })
            .filter(Boolean);

        if (!links.length) return false;

        target.container.innerHTML = links.join('');
        target.section.hidden = false;
        return true;
    }

    function renderOfficeInformation(data) {
        clearRenderedSections();

        if (!data || typeof data !== 'object') {
            setEmptyState();
            return;
        }

        const rendered = [
            renderOverview(data.overview || data.office),
            renderContact(data.contact),
            renderHours(data.hours || data.workingHours),
            renderDepartments(data.departments),
            renderPolicies(data.policies || data.rules),
            renderImportantContacts(data.importantContacts),
            renderResources(data.resources)
        ].some(Boolean);

        if (!rendered) {
            setEmptyState();
            return;
        }

        showContent();
    }

    /*
     * Integration boundary:
     * The future authenticated REST API should provide normalized office data
     * to renderOfficeInformation(data). Authentication remains server-side;
     * this page does not read, store, or expose JWT cookies.
     *
     * Until the REST API is connected, no fake production office data is used.
     */
    async function loadOfficeInformation() {
        setLoadingState();

        try {
            if (
                typeof window.PrimeItOfficeInformationProvider === 'function'
            ) {
                const data = await window.PrimeItOfficeInformationProvider();
                renderOfficeInformation(data);
                return;
            }

            if (
                window.PrimeItOfficeInformationData &&
                typeof window.PrimeItOfficeInformationData === 'object'
            ) {
                renderOfficeInformation(window.PrimeItOfficeInformationData);
                return;
            }

            setEmptyState();
        } catch (error) {
            // Do not expose server errors, tokens, credentials, or stack traces.
            setErrorState();
        }
    }

    function setupMobileNavigation() {
        if (!mobileToggle || !sidebar) return;

        mobileToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');

            mobileToggle.setAttribute('aria-expanded', String(isOpen));
            mobileToggle.setAttribute(
                'aria-label',
                isOpen ? 'Close navigation menu' : 'Open navigation menu'
            );
        });

        document.querySelectorAll('.sidebar a').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileToggle.setAttribute('aria-label', 'Open navigation menu');
            });
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileToggle.setAttribute('aria-label', 'Open navigation menu');
                mobileToggle.focus();
            }
        });
    }

    setupMobileNavigation();
    loadOfficeInformation();
})();