(() => {
    'use strict';

    const state = {
        office: null,
        departments: [],
        contacts: [],
        policies: [],
        resources: [],
        hours: [],
        modalType: null,
        editingId: null,
        lastFocused: null
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const elements = {
        sidebar: $('#admin-sidebar'),
        mobileToggle: $('.mobile-toggle'),
        status: $('#office-status'),
        editOffice: $('#edit-office-button'),
        overviewContent: $('#overview-content'),
        overviewMeta: $('#overview-meta'),
        officeBadge: $('#office-status-badge'),
        hours: $('#hours-list'),
        departments: $('#departments-list'),
        contacts: $('#contacts-list'),
        policies: $('#policies-list'),
        resources: $('#resources-list'),
        modal: $('#modal-backdrop'),
        modalTitle: $('#modal-title'),
        modalLabel: $('#modal-label'),
        modalDescription: $('#modal-description'),
        modalFields: $('#modal-fields'),
        managementForm: $('#management-form'),
        formMessage: $('#form-message'),
        modalSave: $('#modal-save'),
        modalClose: $('#modal-close'),
        modalCancel: $('#modal-cancel'),
        details: $('#details-backdrop'),
        detailsTitle: $('#details-title'),
        detailsContent: $('#details-content'),
        detailsClose: $('#details-close'),
        detailsDismiss: $('#details-dismiss'),
        toastRegion: $('#toast-region')
    };

    const filters = {
        departmentSearch: $('#department-search'),
        departmentStatus: $('#department-status-filter'),
        contactSearch: $('#contact-search'),
        contactType: $('#contact-type-filter'),
        contactStatus: $('#contact-status-filter'),
        policySearch: $('#policy-search'),
        policyCategory: $('#policy-category-filter'),
        policyStatus: $('#policy-status-filter'),
        resourceSearch: $('#resource-search'),
        resourceCategory: $('#resource-category-filter'),
        resourceStatus: $('#resource-status-filter')
    };

    const emptyMessages = {
        departments: ['No departments available.', 'Departments received from the backend will appear here.'],
        contacts: ['No important contacts available.', 'Approved office contacts will appear here.'],
        policies: ['No office policies available.', 'Published or draft policies will appear here.'],
        resources: ['No useful resources available.', 'Approved office resources will appear here.']
    };

    function escapeText(value) {
        return String(value ?? '');
    }

    function normalize(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function normalizeStatus(value, fallback = 'active') {
        const allowed = ['active', 'archived', 'published', 'draft'];
        return allowed.includes(value) ? value : fallback;
    }

    function uid(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }

    function showStatus(type, title, message, actionLabel = '', action = null) {
        if (!elements.status) return;
        elements.status.replaceChildren();
        const box = document.createElement('div');
        box.className = 'status-card ' + type;
        const content = document.createElement('div');
        const strong = document.createElement('p');
        strong.className = 'status-title';
        strong.textContent = title;
        const text = document.createElement('p');
        text.className = 'status-message';
        text.textContent = message;
        content.append(strong, text);
        box.append(content);

        if (actionLabel && typeof action === 'function') {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-secondary btn-sm status-action';
            button.textContent = actionLabel;
            button.addEventListener('click', action);
            box.append(button);
        }
        elements.status.append(box);
    }

    function clearStatus() {
        elements.status?.replaceChildren();
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        elements.toastRegion?.append(toast);
        window.setTimeout(() => toast.remove(), 3200);
    }

    function createEmptyState(key) {
        const [title, message] = emptyMessages[key];
        const wrapper = document.createElement('div');
        wrapper.className = 'empty-state';
        const strong = document.createElement('strong');
        strong.textContent = title;
        const p = document.createElement('p');
        p.textContent = message;
        wrapper.append(strong, p);
        return wrapper;
    }

    function createBadge(text, type = 'neutral') {
        const badge = document.createElement('span');
        badge.className = 'badge ' + type;
        badge.textContent = text;
        return badge;
    }

    function statusType(status) {
        if (status === 'active' || status === 'published') return 'success';
        if (status === 'draft') return 'warning';
        if (status === 'archived') return 'danger';
        return 'neutral';
    }

    function createActionButton(label, action, variant = 'secondary') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-sm ' + (variant === 'danger' ? 'btn-danger' : 'btn-secondary');
        button.textContent = label;
        button.addEventListener('click', action);
        return button;
    }

    function matchesSearch(item, query, fields) {
        const q = normalize(query).toLowerCase();
        if (!q) return true;
        return fields.some(field => normalize(item[field]).toLowerCase().includes(q));
    }

    function renderOverview() {
        elements.overviewContent.replaceChildren();
        if (!state.office) {
            const empty = createEmptyState('departments');
            empty.querySelector('strong').textContent = 'Office information is not configured.';
            empty.querySelector('p').textContent = 'Office information received from the backend will appear here.';
            elements.overviewContent.append(empty);
            elements.officeBadge.replaceWith(createBadge('Not configured', 'neutral'));
            elements.officeBadge = $('.overview-card .badge');
            elements.overviewMeta.textContent = '';
            return;
        }

        const primary = document.createElement('div');
        primary.className = 'overview-primary';
        const title = document.createElement('h3');
        title.textContent = normalize(state.office.officeName) || 'Office';
        const description = document.createElement('p');
        description.textContent = normalize(state.office.description) || 'No office description has been provided.';
        primary.append(title, description);

        const items = [
            ['Address', state.office.address],
            ['Phone', state.office.phone],
            ['Email', state.office.email],
            ['Timezone', state.office.timezone]
        ];

        const fragment = document.createDocumentFragment();
        fragment.append(primary);
        items.forEach(([label, value]) => {
            const item = document.createElement('div');
            item.className = 'info-item';
            const l = document.createElement('span');
            l.className = 'info-label';
            l.textContent = label;
            const v = document.createElement('span');
            v.className = 'info-value';
            v.textContent = normalize(value) || 'Not configured';
            item.append(l, v);
            fragment.append(item);
        });
        elements.overviewContent.append(fragment);

        const badge = createBadge(normalize(state.office.status) || 'active', statusType(normalize(state.office.status) || 'active'));
        elements.officeBadge.replaceWith(badge);
        elements.officeBadge = badge;
        elements.overviewMeta.textContent = state.office.updatedAt ? 'Last updated: ' + state.office.updatedAt : 'Last updated date is not available.';
    }

    function renderHours() {
        elements.hours.replaceChildren();
        if (!state.hours.length) {
            const empty = createEmptyState('departments');
            empty.querySelector('strong').textContent = 'Working hours are not configured.';
            empty.querySelector('p').textContent = 'Configure the weekly schedule when office data is connected.';
            elements.hours.append(empty);
            return;
        }
        state.hours.forEach(item => {
            const row = document.createElement('div');
            row.className = 'hours-row';
            const day = document.createElement('span');
            day.className = 'hours-day';
            day.textContent = normalize(item.day) || 'Day';
            const time = document.createElement('span');
            time.className = item.closed ? 'hours-closed' : 'hours-time';
            time.textContent = item.closed ? 'Closed' : ((item.openingTime || 'Not set') + ' — ' + (item.closingTime || 'Not set'));
            const action = document.createElement('div');
            action.className = 'card-actions';
            action.append(createActionButton('Edit', () => openModal('hours', item.id)));
            row.append(day, time, action);
            elements.hours.append(row);
        });
    }

    function renderCollection(type, container, key, items, search, statusFilter, categoryFilter) {
        container.replaceChildren();
        const filtered = items.filter(item => {
            if (type === 'department') {
                return matchesSearch(item, search.value, ['name', 'description', 'contact']) &&
                    (statusFilter.value === 'all' || normalizeStatus(item.status) === statusFilter.value);
            }
            if (type === 'contact') {
                return matchesSearch(item, search.value, ['name', 'designation', 'department', 'email', 'phone', 'type']) &&
                    (statusFilter.value === 'all' || normalizeStatus(item.status) === statusFilter.value) &&
                    (categoryFilter.value === 'all' || normalize(item.type) === categoryFilter.value);
            }
            if (type === 'policy') {
                return matchesSearch(item, search.value, ['title', 'description', 'content', 'category']) &&
                    (statusFilter.value === 'all' || normalizeStatus(item.status, 'draft') === statusFilter.value) &&
                    (categoryFilter.value === 'all' || normalize(item.category) === categoryFilter.value);
            }
            return matchesSearch(item, search.value, ['title', 'description', 'url', 'category']) &&
                (statusFilter.value === 'all' || normalizeStatus(item.status, 'draft') === statusFilter.value) &&
                (categoryFilter.value === 'all' || normalize(item.category) === categoryFilter.value);
        });

        if (!filtered.length) {
            const empty = createEmptyState(items.length ? 'departments' : key);
            if (items.length) {
                empty.querySelector('strong').textContent = 'No matching information.';
                empty.querySelector('p').textContent = 'Try clearing the search or filters.';
            }
            container.append(empty);
            return;
        }

        filtered.forEach(item => container.append(createResourceCard(type, item)));
    }

    function createResourceCard(type, item) {
        const article = document.createElement('article');
        article.className = 'resource-card';

        const title = document.createElement('h3');
        title.textContent = normalize(item.name) || normalize(item.title) || 'Untitled';
        article.append(title);

        const description = document.createElement('p');
        description.textContent = normalize(item.description) || normalize(item.content) || 'No description provided.';
        article.append(description);

        const meta = document.createElement('div');
        meta.className = 'card-meta';
        const left = document.createElement('div');
        left.append(createBadge(normalize(item.status) || (type === 'department' || type === 'contact' ? 'active' : 'draft'), statusType(normalize(item.status) || (type === 'department' || type === 'contact' ? 'active' : 'draft'))));
        if (item.category || item.type) {
            const category = document.createElement('span');
            category.className = 'muted';
            category.textContent = normalize(item.category) || normalize(item.type);
            left.append(category);
        }
        meta.append(left);

        const actions = document.createElement('div');
        actions.className = 'card-actions';
        actions.append(
            createActionButton('View', () => openDetails(type, item)),
            createActionButton('Edit', () => openModal(type, item.id)),
            createActionButton(item.status === 'archived' ? 'Restore' : 'Archive', () => toggleArchive(type, item.id), item.status === 'archived' ? 'secondary' : 'danger')
        );
        meta.append(actions);
        article.append(meta);
        return article;
    }

    function refreshFilters() {
        const sets = [
            [filters.contactType, state.contacts.map(x => normalize(x.type)).filter(Boolean)],
            [filters.policyCategory, state.policies.map(x => normalize(x.category)).filter(Boolean)],
            [filters.resourceCategory, state.resources.map(x => normalize(x.category)).filter(Boolean)]
        ];
        sets.forEach(([select, values]) => {
            if (!select) return;
            const current = select.value;
            select.replaceChildren(new Option('All ' + (select === filters.contactType ? 'types' : 'categories'), 'all'));
            [...new Set(values)].sort().forEach(value => select.append(new Option(value, value)));
            select.value = values.includes(current) ? current : 'all';
        });
    }

    function renderAll() {
        renderOverview();
        renderHours();
        renderCollection('department', elements.departments, 'departments', state.departments, filters.departmentSearch, filters.departmentStatus, {value:'all'});
        renderCollection('contact', elements.contacts, 'contacts', state.contacts, filters.contactSearch, filters.contactStatus, filters.contactType);
        renderCollection('policy', elements.policies, 'policies', state.policies, filters.policySearch, filters.policyStatus, filters.policyCategory);
        renderCollection('resource', elements.resources, 'resources', state.resources, filters.resourceSearch, filters.resourceStatus, filters.resourceCategory);
        refreshFilters();
    }

    function findItem(type, id) {
        const collection = type === 'department' ? state.departments :
            type === 'contact' ? state.contacts :
            type === 'policy' ? state.policies :
            type === 'resource' ? state.resources : state.hours;
        return collection.find(item => item.id === id);
    }

    function collectionFor(type) {
        return type === 'department' ? state.departments :
            type === 'contact' ? state.contacts :
            type === 'policy' ? state.policies :
            type === 'resource' ? state.resources : state.hours;
    }

    function toggleArchive(type, id) {
        const item = findItem(type, id);
        if (!item) return;
        if (type === 'department' || type === 'contact') item.status = item.status === 'archived' ? 'active' : 'archived';
        else item.status = item.status === 'archived' ? 'draft' : 'archived';
        renderAll();
        showToast('Draft state updated for this page session. No backend data was changed.');
    }

    function field(def) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-field';
        const label = document.createElement('label');
        label.htmlFor = 'field-' + def.name;
        label.textContent = def.label;
        if (def.required) {
            const mark = document.createElement('span');
            mark.className = 'required-mark';
            mark.textContent = ' *';
            label.append(mark);
        }
        wrapper.append(label);

        let control;
        if (def.type === 'textarea') control = document.createElement('textarea');
        else if (def.type === 'select') {
            control = document.createElement('select');
            def.options.forEach(option => control.append(new Option(option.label, option.value)));
        } else {
            control = document.createElement('input');
            control.type = def.type || 'text';
        }
        control.id = 'field-' + def.name;
        control.name = def.name;
        if (def.placeholder) control.placeholder = def.placeholder;
        if (def.autocomplete) control.autocomplete = def.autocomplete;
        if (def.required) control.required = true;
        if (def.type === 'checkbox') control.checked = Boolean(def.value);
        else if (def.value !== undefined && def.value !== null) control.value = def.value;
        if (def.type === 'checkbox') {
            wrapper.className = 'form-field checkbox-field';
            label.htmlFor = 'field-' + def.name;
            wrapper.replaceChildren(control, label);
        } else wrapper.append(control);
        return wrapper;
    }

    function getFields(type, item = {}) {
        if (type === 'office') return [
            {name:'officeName',label:'Office Name',required:true,value:item.officeName,autocomplete:'organization'},
            {name:'description',label:'Description',type:'textarea',value:item.description,placeholder:'Office description will be provided by the backend.'},
            {name:'address',label:'Address',value:item.address,autocomplete:'street-address'},
            {name:'phone',label:'Phone',type:'tel',value:item.phone,autocomplete:'tel'},
            {name:'email',label:'Email',type:'email',value:item.email,autocomplete:'email'},
            {name:'timezone',label:'Timezone',value:item.timezone,placeholder:'Timezone will be provided by the backend.'},
            {name:'status',label:'Status',type:'select',value:item.status || 'active',options:[{label:'Active',value:'active'},{label:'Archived',value:'archived'}]}
        ];
        if (type === 'hours') return [
            {name:'day',label:'Day',required:true,value:item.day},
            {name:'openingTime',label:'Opening Time',type:'time',value:item.openingTime},
            {name:'closingTime',label:'Closing Time',type:'time',value:item.closingTime},
            {name:'closed',label:'Closed',type:'checkbox',value:item.closed ? 'on' : undefined}
        ];
        if (type === 'department') return [
            {name:'name',label:'Department Name',required:true,value:item.name},
            {name:'description',label:'Description',type:'textarea',value:item.description},
            {name:'contact',label:'Contact',value:item.contact,placeholder:'Use approved office contact information only.'},
            {name:'status',label:'Status',type:'select',value:item.status || 'active',options:[{label:'Active',value:'active'},{label:'Archived',value:'archived'}]}
        ];
        if (type === 'contact') return [
            {name:'name',label:'Name',required:true,value:item.name},
            {name:'designation',label:'Designation',value:item.designation},
            {name:'department',label:'Department',value:item.department},
            {name:'phone',label:'Phone',type:'tel',value:item.phone,autocomplete:'tel'},
            {name:'email',label:'Email',type:'email',value:item.email,autocomplete:'email'},
            {name:'type',label:'Contact Type',required:true,value:item.type,placeholder:'e.g. support, emergency'},
            {name:'status',label:'Status',type:'select',value:item.status || 'active',options:[{label:'Active',value:'active'},{label:'Archived',value:'archived'}]}
        ];
        if (type === 'policy') return [
            {name:'title',label:'Policy Title',required:true,value:item.title},
            {name:'category',label:'Category',value:item.category},
            {name:'description',label:'Description',type:'textarea',value:item.description},
            {name:'content',label:'Content',type:'textarea',value:item.content},
            {name:'status',label:'Status',type:'select',value:item.status || 'draft',options:[{label:'Published',value:'published'},{label:'Draft',value:'draft'},{label:'Archived',value:'archived'}]}
        ];
        return [
            {name:'title',label:'Resource Title',required:true,value:item.title},
            {name:'description',label:'Description',type:'textarea',value:item.description},
            {name:'url',label:'URL',required:true,type:'url',value:item.url,placeholder:'https://example.com'},
            {name:'category',label:'Category',value:item.category},
            {name:'status',label:'Status',type:'select',value:item.status || 'draft',options:[{label:'Published',value:'published'},{label:'Draft',value:'draft'},{label:'Archived',value:'archived'}]}
        ];
    }

    function openModal(type, id = null) {
        state.lastFocused = document.activeElement;
        state.modalType = type;
        state.editingId = id;
        const item = id ? findItem(type, id) || {} : {};
        const labels = {office:'Office Information',hours:'Working Hours',department:'Department',contact:'Important Contact',policy:'Office Policy',resource:'Useful Resource'};
        const isEdit = Boolean(id) || type === 'office';
        elements.modalLabel.textContent = labels[type] || 'Office Information';
        elements.modalTitle.textContent = isEdit ? 'Edit ' + labels[type] : 'Add ' + labels[type];
        elements.modalDescription.textContent = 'Changes are kept only in this page session until the authenticated REST API is connected.';
        elements.modalFields.replaceChildren(...getFields(type, item).map(field));
        elements.formMessage.hidden = true;
        elements.modal.hidden = false;
        document.body.classList.add('modal-open');
        window.setTimeout(() => {
            const first = $('input,select,textarea', elements.modalFields);
            first?.focus();
        }, 0);
    }

    function closeModal() {
        elements.modal.hidden = true;
        document.body.classList.remove('modal-open');
        elements.managementForm.reset();
        state.modalType = null;
        state.editingId = null;
        state.lastFocused?.focus?.();
    }

    function openDetails(type, item) {
        state.lastFocused = document.activeElement;
        elements.detailsTitle.textContent = normalize(item.name) || normalize(item.title) || 'Details';
        elements.detailsContent.replaceChildren();
        const grid = document.createElement('div');
        grid.className = 'detail-grid';
        Object.entries(item).forEach(([key, value]) => {
            if (key === 'id') return;
            const box = document.createElement('div');
            box.className = 'detail-item';
            const label = document.createElement('strong');
            label.textContent = key.replace(/[A-Z]/g, m => ' ' + m).replace(/^./, m => m.toUpperCase());
            const valueNode = document.createElement('span');
            valueNode.textContent = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? 'Not provided');
            box.append(label, valueNode);
            grid.append(box);
        });
        elements.detailsContent.append(grid);
        elements.details.hidden = false;
        document.body.classList.add('modal-open');
        window.setTimeout(() => elements.detailsClose.focus(), 0);
    }

    function closeDetails() {
        elements.details.hidden = true;
        document.body.classList.remove('modal-open');
        elements.detailsContent.replaceChildren();
        state.lastFocused?.focus?.();
    }

    function readForm() {
        const data = {};
        const formData = new FormData(elements.managementForm);
        for (const [key, value] of formData.entries()) data[key] = typeof value === 'string' ? value.trim() : value;
        const closed = $('#field-closed');
        if (closed) data.closed = closed.checked;
        return data;
    }

    function validate(type, data) {
        const required = getFields(type).filter(x => x.required);
        for (const item of required) {
            if (!normalize(data[item.name])) return item.label + ' is required.';
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email address.';
        if (type === 'resource' && data.url && !/^https?:\/\/[^\s]+$/i.test(data.url)) return 'Enter a valid HTTP or HTTPS URL.';
        if (type === 'hours' && !data.closed && data.openingTime && data.closingTime && data.openingTime >= data.closingTime) return 'Closing time must be later than opening time.';
        return '';
    }

    function saveForm(event) {
        event.preventDefault();
        const type = state.modalType;
        const data = readForm();
        const error = validate(type, data);
        if (error) {
            elements.formMessage.textContent = error;
            elements.formMessage.hidden = false;
            return;
        }

        if (type === 'office') {
            state.office = {...data, updatedAt: 'Pending backend persistence'};
        } else {
            const collection = collectionFor(type);
            if (state.editingId) {
                const item = findItem(type, state.editingId);
                if (item) Object.assign(item, data);
            } else {
                data.id = uid(type);
                if (type === 'policy' || type === 'resource') data.status = data.status || 'draft';
                collection.push(data);
            }
        }

        closeModal();
        renderAll();
        showStatus('warning', 'Frontend draft updated', 'The change is only held in memory for this page session. No backend request or database write was performed.');
    }

    function setupFilters() {
        Object.values(filters).forEach(control => control?.addEventListener('input', renderAll));
        Object.values(filters).forEach(control => control?.addEventListener('change', renderAll));
    }

    function setupNavigation() {
        if (!elements.mobileToggle || !elements.sidebar) return;
        elements.mobileToggle.addEventListener('click', () => {
            const open = elements.sidebar.classList.toggle('open');
            elements.mobileToggle.setAttribute('aria-expanded', String(open));
            elements.mobileToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        });
        $$('.sidebar a').forEach(link => link.addEventListener('click', () => {
            elements.sidebar.classList.remove('open');
            elements.mobileToggle.setAttribute('aria-expanded', 'false');
            elements.mobileToggle.setAttribute('aria-label', 'Open navigation menu');
        }));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && elements.sidebar.classList.contains('open')) {
                elements.sidebar.classList.remove('open');
                elements.mobileToggle.setAttribute('aria-expanded', 'false');
                elements.mobileToggle.focus();
            }
        });
    }

    function setupModal() {
        elements.editOffice.addEventListener('click', () => openModal('office'));
        $$('[data-add]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.add)));
        elements.managementForm.addEventListener('submit', saveForm);
        elements.modalClose.addEventListener('click', closeModal);
        elements.modalCancel.addEventListener('click', closeModal);
        elements.detailsClose.addEventListener('click', closeDetails);
        elements.detailsDismiss.addEventListener('click', closeDetails);
        [elements.modal, elements.details].forEach(backdrop => backdrop.addEventListener('click', event => {
            if (event.target === backdrop) backdrop === elements.modal ? closeModal() : closeDetails();
        }));
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            if (!elements.modal.hidden) closeModal();
            else if (!elements.details.hidden) closeDetails();
        });
    }

    function normalizeIncomingData(data) {
        if (!data || typeof data !== 'object') return null;
        const rawOffice = data.office || data.overview || null;
        const office = rawOffice ? {
            ...rawOffice,
            officeName: rawOffice.officeName || rawOffice.name || '',
            description: rawOffice.description || '',
            address: rawOffice.address || (data.contact && data.contact.address) || '',
            phone: rawOffice.phone || (data.contact && data.contact.phone) || '',
            email: rawOffice.email || (data.contact && data.contact.email) || '',
            timezone: rawOffice.timezone || ''
        } : null;
        return {
            office,
            departments: Array.isArray(data.departments) ? data.departments : [],
            contacts: Array.isArray(data.importantContacts) ? data.importantContacts : (Array.isArray(data.contacts) ? data.contacts : []),
            policies: Array.isArray(data.policies) ? data.policies : [],
            resources: Array.isArray(data.resources) ? data.resources : [],
            hours: Array.isArray(data.workingHours) ? data.workingHours : (Array.isArray(data.hours) ? data.hours : [])
        };
    }

    async function loadOfficeInformation() {
        showStatus('info', 'Loading office information', 'Waiting for approved office data.');
        try {
            let data = null;
            if (typeof window.PrimeItOfficeInformationProvider === 'function') {
                data = await window.PrimeItOfficeInformationProvider();
            } else if (window.PrimeItOfficeInformationData && typeof window.PrimeItOfficeInformationData === 'object') {
                data = window.PrimeItOfficeInformationData;
            }

            const normalized = normalizeIncomingData(data);
            if (!normalized) {
                state.office = null;
                state.departments = [];
                state.contacts = [];
                state.policies = [];
                state.resources = [];
                state.hours = [];
                renderAll();
                showStatus('warning', 'No office information configured', 'No backend data is connected yet. The management interface is ready for future API integration.');
                return;
            }

            Object.assign(state, normalized);
            renderAll();
            clearStatus();
        } catch (error) {
            renderAll();
            showStatus('error', 'Unable to load office information', 'The information source could not be loaded.', 'Retry', loadOfficeInformation);
        }
    }

    function init() {
        setupNavigation();
        setupModal();
        setupFilters();
        renderAll();
        loadOfficeInformation();
    }

    init();
})();