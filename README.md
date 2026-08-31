# PrimeIt 

A UI/UX-only prototype for the PrimeIt public website, office member system, and admin system.

Design: light theme, white + blue + black + purple, modern cards, animated landing page, hover effects, responsive layouts. Logo and icons are placeholders so they can be replaced later.

No backend, MySQL, JWT, REST API, real authentication, authorization, image upload, or persistent data is implemented yet. Buttons/forms are demo interactions only.

## Structure
```text
PrimeIt/
├── public/
├── member/
├── admin/
├── css/
├── js/
└── assets/
    ├── images/
    ├── icons/
    └── logo/
```

Open `public/index.html` to view the animated landing page.

Because `member/leave-management.html` and `admin/leave-management.html` are separate pages, the flat CSS/JS folders use unique admin filenames: `admin-leave-management.css` and `admin-leave-management.js`.
