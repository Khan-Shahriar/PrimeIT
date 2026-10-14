(function () {
  "use strict";
  const INPUT_SELECTOR = 'input[type="date"], input[type="datetime-local"]';
  const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const DISPLAY_FORMAT = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  let activePicker = null;

  const pad = (value) => String(value).padStart(2, "0");
  const toISODate = (date) => date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  const parseDate = (value) => {
    if (!value) return null;
    const parts = value.slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };
  const sameDate = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dateOnly = (value) => value ? value.slice(0, 10) : "";
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function enhance(input) {
    if (input.dataset.primeitCalendarReady === "true") return;
    input.dataset.primeitCalendarReady = "true";
    const isDateTime = input.type === "datetime-local";
    const originalType = input.type;
    const wrapper = make("div", "primeit-date-picker");
    wrapper.dataset.calendarFor = input.id || input.name || "date";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.classList.add("primeit-native-date");

    const trigger = make("button", "primeit-date-trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", (input.labels && input.labels[0] ? input.labels[0].textContent.trim() : input.getAttribute("aria-label") || input.name || "Choose date") + " calendar");
    const value = make("span", "primeit-date-value");
    const icon = make("span", "primeit-date-icon", "▦");
    icon.setAttribute("aria-hidden", "true");
    trigger.append(value, icon);
    wrapper.appendChild(trigger);

    const popover = make("div", "primeit-calendar-popover");
    popover.hidden = true;
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Choose date");
    const header = make("div", "primeit-calendar-header");
    const prev = make("button", "primeit-calendar-nav", "‹");
    prev.type = "button"; prev.setAttribute("aria-label", "Previous month");
    const monthLabel = make("div", "primeit-calendar-month");
    monthLabel.setAttribute("aria-live", "polite");
    const next = make("button", "primeit-calendar-nav", "›");
    next.type = "button"; next.setAttribute("aria-label", "Next month");
    header.append(prev, monthLabel, next);
    const weekdayRow = make("div", "primeit-calendar-weekdays");
    weekdayRow.setAttribute("aria-hidden", "true");
    WEEKDAYS.forEach((day) => weekdayRow.appendChild(make("span", "primeit-calendar-weekday", day)));
    const days = make("div", "primeit-calendar-days");
    days.setAttribute("role", "grid");
    const footer = make("div", "primeit-calendar-footer");
    const today = make("button", "primeit-calendar-action", "Today");
    today.type = "button";
    const clear = make("button", "primeit-calendar-action", "Clear date");
    clear.type = "button";
    footer.append(today, clear);
    let timeInput = null;
    if (isDateTime) {
      const timeRow = make("div", "primeit-calendar-time");
      const timeLabel = make("label", "", "Time");
      timeInput = make("input");
      timeInput.type = "time";
      timeInput.step = input.step && input.step !== "any" ? input.step : "60";
      timeLabel.htmlFor = "primeit-time-" + Math.random().toString(36).slice(2, 9);
      timeInput.id = timeLabel.htmlFor;
      timeRow.append(timeLabel, timeInput);
      popover.append(header, weekdayRow, days, timeRow, footer);
    } else {
      popover.append(header, weekdayRow, days, footer);
    }
    wrapper.appendChild(popover);

    let viewDate = parseDate(input.value) || parseDate(input.min) || new Date();
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const minDate = () => parseDate(input.min);
    const maxDate = () => parseDate(input.max);

    function syncValue() {
      const selected = parseDate(input.value);
      value.textContent = selected ? DISPLAY_FORMAT.format(selected) + (isDateTime && input.value.length > 10 ? " · " + input.value.slice(11, 16) : "") : (input.placeholder || "Select date");
      value.classList.toggle("is-placeholder", !selected);
      trigger.setAttribute("aria-label", (input.labels && input.labels[0] ? input.labels[0].textContent.trim() : input.getAttribute("aria-label") || input.name || "Choose date") + ": " + (selected ? value.textContent : "Select date"));
      if (timeInput && input.value.length > 10) timeInput.value = input.value.slice(11, 16);
    }

    function withinBounds(date) {
      const min = minDate(), max = maxDate();
      return (!min || date >= new Date(min.getFullYear(), min.getMonth(), min.getDate())) && (!max || date <= new Date(max.getFullYear(), max.getMonth(), max.getDate()));
    }

    function setDate(date, closeAfter) {
      const dateString = toISODate(date);
      if (isDateTime) {
        const time = timeInput.value || (input.value.length > 10 ? input.value.slice(11, 16) : "09:00");
        input.value = dateString + "T" + time;
      } else {
        input.value = dateString;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      syncValue();
      viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
      render();
      if (closeAfter) close();
    }

    function render() {
      monthLabel.textContent = MONTH_FORMAT.format(viewDate);
      days.replaceChildren();
      const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      const startDay = first.getDay();
      const count = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
      const selected = parseDate(input.value);
      for (let i = 0; i < startDay; i++) {
        const blank = make("span", "primeit-calendar-day");
        blank.setAttribute("aria-hidden", "true");
        blank.style.visibility = "hidden";
        days.appendChild(blank);
      }
      for (let day = 1; day <= count; day++) {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const button = make("button", "primeit-calendar-day", String(day));
        button.type = "button";
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", DISPLAY_FORMAT.format(date));
        button.setAttribute("aria-selected", sameDate(date, selected) ? "true" : "false");
        if (sameDate(date, selected)) button.classList.add("is-selected");
        if (sameDate(date, new Date())) button.classList.add("is-today");
        if (!withinBounds(date)) button.disabled = true;
        button.addEventListener("click", () => setDate(date, true));
        days.appendChild(button);
      }
      const min = minDate(), max = maxDate();
      prev.disabled = !!min && new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1) < new Date(min.getFullYear(), min.getMonth(), 1);
      next.disabled = !!max && new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1) > new Date(max.getFullYear(), max.getMonth(), 1);
    }

    function open() {
      if (activePicker && activePicker !== wrapper) activePicker.querySelector(".primeit-date-trigger")?.click();
      activePicker = wrapper;
      viewDate = new Date((parseDate(input.value) || parseDate(input.min) || new Date()).getFullYear(), (parseDate(input.value) || parseDate(input.min) || new Date()).getMonth(), 1);
      render();
      popover.hidden = false;
      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      const selectedButton = days.querySelector(".is-selected:not(:disabled)") || days.querySelector(".is-today:not(:disabled)") || days.querySelector("button:not(:disabled)");
      if (selectedButton) selectedButton.focus({ preventScroll: true });
    }
    function close() {
      popover.hidden = true;
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (activePicker === wrapper) activePicker = null;
    }

    trigger.addEventListener("click", () => popover.hidden ? open() : close());
    prev.addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); render(); });
    next.addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); render(); });
    today.addEventListener("click", () => { const now = new Date(); if (withinBounds(now)) setDate(now, true); });
    clear.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      syncValue(); close(); trigger.focus();
    });
    if (timeInput) timeInput.addEventListener("change", () => {
      if (input.value.length > 10) {
        input.value = input.value.slice(0, 10) + "T" + timeInput.value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        syncValue();
      }
    });
    input.addEventListener("change", syncValue);
    input.addEventListener("input", syncValue);
    input.addEventListener("invalid", () => { trigger.setAttribute("aria-invalid", "true"); });
    trigger.addEventListener("blur", () => trigger.removeAttribute("aria-invalid"));
    syncValue();
  }

  document.addEventListener("click", (event) => {
    if (!activePicker || activePicker.contains(event.target)) return;
    activePicker.querySelector(".primeit-date-trigger")?.click();
  });
  document.addEventListener("keydown", (event) => {
    if (!activePicker) return;
    if (event.key === "Escape") {
      const trigger = activePicker.querySelector(".primeit-date-trigger");
      trigger?.click();
      trigger?.focus();
    }
  });
  function init(root) { (root || document).querySelectorAll(INPUT_SELECTOR).forEach(enhance); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init());
  else init();
})();