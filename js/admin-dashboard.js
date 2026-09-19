(() => {
  "use strict";

  const dashboard = {
    state: {
      status: "ready",
      data: null,
      logoutRequested: false
    },

    // The 2026 holiday values are the project-defined calendar data.
    // Later API/database integration should replace this source of truth.
    knownHolidays: [
      { name: "New Year", date: "2026-01-01" },
      { name: "Memorial Day", date: "2026-05-25" },
      { name: "Independence Day", date: "2026-07-04" },
      { name: "Labor Day", date: "2026-09-07" },
      { name: "Thanksgiving", date: "2026-11-26" },
      { name: "Christmas", date: "2026-12-25" }
    ],

    init() {
      this.cacheElements();
      this.bindNavigation();
      this.bindLogout();
      this.renderCurrentDate();
      this.renderUpcomingHolidays();
      this.prepareDataStates();
    },

    cacheElements() {
      this.sidebar = document.querySelector("#admin-sidebar");
      this.sidebarToggle = document.querySelector("[data-sidebar-toggle]");
      this.sidebarClose = document.querySelector("[data-sidebar-close]");
      this.logoutButton = document.querySelector("[data-logout]");
      this.dashboardStatus = document.querySelector("[data-dashboard-status]");
      this.message = document.querySelector("[data-dashboard-message]");
    },

    bindNavigation() {
      if (!this.sidebar || !this.sidebarToggle) return;

      this.sidebarToggle.addEventListener("click", () => {
        const isOpen = this.sidebar.classList.toggle("open");
        this.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
        this.sidebarToggle.setAttribute(
          "aria-label",
          isOpen ? "Close admin navigation" : "Open admin navigation"
        );
        document.body.classList.toggle("sidebar-open", isOpen);
        if (this.sidebarClose) this.sidebarClose.hidden = !isOpen;
      });

      this.sidebarClose?.addEventListener("click", () => this.closeSidebar());

      this.sidebar.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => this.closeSidebar());
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 680) this.closeSidebar();
      });
    },

    closeSidebar() {
      if (!this.sidebar) return;
      this.sidebar.classList.remove("open");
      this.sidebarToggle?.setAttribute("aria-expanded", "false");
      this.sidebarToggle?.setAttribute("aria-label", "Open admin navigation");
      document.body.classList.remove("sidebar-open");
      if (this.sidebarClose) this.sidebarClose.hidden = true;
    },

    bindLogout() {
      this.logoutButton?.addEventListener("click", () => {
        // Authentication/JWT invalidation belongs to the later authentication section.
        this.state.logoutRequested = true;
        this.showMessage("Logout is prepared for the future authentication integration.");
      });
    },

    renderCurrentDate() {
      const element = document.querySelector("[data-current-date]");
      if (!element) return;

      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(now);

      element.textContent = formatted;
      element.dateTime = now.toISOString().slice(0, 10);
    },

    renderUpcomingHolidays() {
      const container = document.querySelector("[data-holiday-list]");
      if (!container) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = this.knownHolidays
        .filter((holiday) => new Date(holiday.date + "T00:00:00") >= today)
        .slice(0, 3);

      if (!upcoming.length) {
        container.innerHTML = '<p class="holiday-empty">No upcoming holidays are available.</p>';
        return;
      }

      container.replaceChildren(
        ...upcoming.map((holiday) => {
          const item = document.createElement("div");
          item.className = "holiday-item";

          const name = document.createElement("span");
          name.className = "holiday-name";
          name.textContent = holiday.name;

          const date = document.createElement("time");
          date.className = "holiday-date";
          date.dateTime = holiday.date;
          date.textContent = this.formatHolidayDate(holiday.date);

          item.append(name, date);
          return item;
        })
      );
    },

    formatHolidayDate(dateValue) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(new Date(dateValue + "T00:00:00"));
    },

    prepareDataStates() {
      this.setStatisticsUnavailable();
      this.setOverviewUnavailable();
      this.setGalleryUnavailable();
      this.setStatus("Dashboard data is ready for future REST API integration.");
    },

    setStatisticsUnavailable() {
      document.querySelectorAll("[data-stat-card]").forEach((card) => {
        const value = card.querySelector("[data-stat-value]");
        const meta = card.querySelector("[data-stat-meta]");
        if (value) value.textContent = "—";
        if (meta) meta.textContent = "Data unavailable";
        card.classList.remove("is-loading");
      });
    },

    setOverviewUnavailable() {
      document.querySelectorAll("[data-overview-value]").forEach((element) => {
        element.textContent = "—";
      });
    },

    setGalleryUnavailable() {
      const count = document.querySelector("[data-gallery-count]");
      const state = document.querySelector("[data-gallery-state]");
      if (count) count.textContent = "—";
      if (state) state.textContent = "Gallery data is not available yet.";
    },

    setStatus(message) {
      if (this.dashboardStatus) this.dashboardStatus.textContent = message;
    },

    showMessage(message) {
      if (!this.message) return;
      this.message.textContent = message;
      this.message.hidden = false;
      window.clearTimeout(this.messageTimer);
      this.messageTimer = window.setTimeout(() => {
        this.message.hidden = true;
      }, 4500);
    },

    // Future API boundary. No endpoint is assumed here.
    async loadDashboardData(fetcher) {
      if (typeof fetcher !== "function") {
        this.setStatus("Dashboard data source is not connected yet.");
        return null;
      }

      this.setStatus("Loading dashboard data…");

      try {
        const data = await fetcher();
        this.state.data = data;
        this.state.status = "loaded";
        this.setStatus("Dashboard data loaded.");
        return data;
      } catch {
        this.state.status = "error";
        this.setStatus("Dashboard data could not be loaded.");
        this.showMessage("Dashboard information is temporarily unavailable.");
        return null;
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => dashboard.init());
  window.PrimeItAdminDashboard = dashboard;
})();