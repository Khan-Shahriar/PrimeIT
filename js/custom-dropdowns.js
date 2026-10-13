(function () {
  "use strict";

  const SELECTOR = "select";
  const WRAPPER_CLASS = "primeit-custom-dropdown";
  let nextId = 0;

  function labelFor(select) {
    const explicit = select.getAttribute("aria-label");
    const label = explicit || (select.labels && Array.from(select.labels).map((item) => item.textContent.trim()).filter(Boolean).join(" ")) || select.name || select.id || "Choose an option";
    const isFilter = /filter/i.test(select.id || "") || !!select.closest(".filter-grid, .filter-row, .filter-controls, .review-queue-filters, [data-filters]");
    return isFilter && !/^filter by /i.test(label) ? "Filter by " + label.toLowerCase() : label;
  }

  function enhance(select) {
    if (!(select instanceof HTMLSelectElement) || select.dataset.primeitDropdownReady === "true") return;
    if (select.closest(".primeit-custom-dropdown")) return;
    if (select.dataset.customDropdownReady === "true" || select.closest(".department-dropdown")) return;

    const parent = select.parentNode;
    if (!parent) return;

    const wrapper = document.createElement("div");
    wrapper.className = WRAPPER_CLASS;
    wrapper.dataset.dropdownFor = select.id || select.name || "select-" + (++nextId);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "department-dropdown-trigger";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", labelFor(select));

    const menu = document.createElement("div");
    menu.className = "department-dropdown-menu";
    menu.id = "primeit-dropdown-menu-" + (++nextId);
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", labelFor(select));
    menu.hidden = true;
    button.setAttribute("aria-controls", menu.id);

    select.classList.add("primeit-native-select");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;
    select.dataset.primeitDropdownReady = "true";
    parent.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.append(button, menu);

    function optionButtons() {
      return Array.from(menu.querySelectorAll('[role="option"]:not(:disabled)'));
    }

    function close(restoreFocus) {
      wrapper.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      menu.hidden = true;
      if (restoreFocus) button.focus();
    }

    function render() {
      const selected = select.options[select.selectedIndex];
      const selectedText = selected ? selected.textContent.trim() : "Choose an option";
      button.textContent = selectedText;
      button.setAttribute("aria-label", labelFor(select) + ": " + selectedText);
      button.disabled = select.disabled;
      menu.replaceChildren();

      Array.from(select.options).forEach((option, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "department-dropdown-option";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(option.value === select.value && option.selected));
        item.textContent = option.textContent.trim();
        item.disabled = option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled);
        if (option.value === select.value && option.selected) item.classList.add("is-selected");
        item.dataset.optionIndex = String(index);
        item.addEventListener("click", () => {
          if (item.disabled) return;
          select.selectedIndex = index;
          select.dispatchEvent(new Event("input", { bubbles: true }));
          select.dispatchEvent(new Event("change", { bubbles: true }));
          render();
          close(true);
        });
        menu.appendChild(item);
      });
      if (select.disabled) close(false);
    }

    function open(focusSelected) {
      if (button.disabled) return;
      document.querySelectorAll("." + WRAPPER_CLASS + ".is-open").forEach((other) => {
        if (other !== wrapper) {
          other.classList.remove("is-open");
          const otherButton = other.querySelector(".department-dropdown-trigger");
          const otherMenu = other.querySelector(".department-dropdown-menu");
          if (otherButton) otherButton.setAttribute("aria-expanded", "false");
          if (otherMenu) otherMenu.hidden = true;
        }
      });
      render();
      wrapper.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      menu.hidden = false;
      if (focusSelected) {
        const options = optionButtons();
        const selectedIndex = options.findIndex((item) => item.getAttribute("aria-selected") === "true");
        (options[selectedIndex >= 0 ? selectedIndex : 0] || button).focus();
      }
    }

    button.addEventListener("click", () => {
      if (menu.hidden) open(false);
      else close(false);
    });

    button.addEventListener("keydown", (event) => {
      const options = optionButtons();
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (menu.hidden) open(true);
        else if (options.length) options[0].focus();
      } else if (event.key === "Escape") {
        close(false);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        open(true);
        const current = optionButtons();
        if (current.length) current[event.key === "Home" ? 0 : current.length - 1].focus();
      }
    });

    menu.addEventListener("keydown", (event) => {
      const options = optionButtons();
      const index = options.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        options[(index + step + options.length) % options.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        options[event.key === "Home" ? 0 : options.length - 1]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "Tab") {
        close(false);
      }
    });

    select.addEventListener("change", render);
    select.addEventListener("input", render);
    select.addEventListener("invalid", () => {
      button.setAttribute("aria-invalid", "true");
      button.focus();
    });
    select.addEventListener("change", () => button.removeAttribute("aria-invalid"));

    const observer = new MutationObserver(() => render());
    observer.observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
    const form = select.form;
    if (form) form.addEventListener("reset", () => window.requestAnimationFrame(render));

    render();
  }

  function scan(root) {
    if (root instanceof HTMLSelectElement) enhance(root);
    if (root.querySelectorAll) root.querySelectorAll(SELECTOR).forEach(enhance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(document), { once: true });
  } else {
    scan(document);
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) scan(node);
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("click", (event) => {
    document.querySelectorAll("." + WRAPPER_CLASS + ".is-open").forEach((wrapper) => {
      if (!wrapper.contains(event.target)) {
        wrapper.classList.remove("is-open");
        const button = wrapper.querySelector(".department-dropdown-trigger");
        const menu = wrapper.querySelector(".department-dropdown-menu");
        if (button) button.setAttribute("aria-expanded", "false");
        if (menu) menu.hidden = true;
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll("." + WRAPPER_CLASS + ".is-open").forEach((wrapper) => {
      wrapper.classList.remove("is-open");
      const button = wrapper.querySelector(".department-dropdown-trigger");
      const menu = wrapper.querySelector(".department-dropdown-menu");
      if (button) {
        button.setAttribute("aria-expanded", "false");
        button.focus();
      }
      if (menu) menu.hidden = true;
    });
  });
})();