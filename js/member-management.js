/* ==========================================
   PrimeIt — Member Management
   Step 5.9.9.1
========================================== */

const API_URL = "/api/members";

const tableBody = document.querySelector("table tbody");
const searchInput = document.querySelector(
    '.toolbar input[placeholder="Search members..."]'
);
const departmentSelect = document.querySelector(".toolbar select:nth-of-type(1)");
const statusSelect = document.querySelector(".toolbar select:nth-of-type(2)");
const addMemberButton = document.querySelector(".btn.btn-primary");


/* ==========================================
   Helpers
========================================== */

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function getInitials(name) {
    if (!name) return "??";

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function formatDate(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    });
}

function showToast(message) {
    let toast = document.querySelector(".toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}


/* ==========================================
   Load Members
========================================== */

async function loadMembers() {
    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:30px;">
                    Loading members...
                </td>
            </tr>
        `;

        const response = await fetch(API_URL, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load members"
            );
        }

        renderMembers(data.members || []);

    } catch (error) {
        console.error("❌ Failed to load members:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:30px;">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
}


/* ==========================================
   Render Members
========================================== */

function renderMembers(members) {
    if (!members.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:30px;">
                    No members found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = members.map(member => {
        const initials = getInitials(member.full_name);

        const statusClass =
            member.status === "active"
                ? "success"
                : "danger";

        const statusText =
            member.status === "active"
                ? "Active"
                : "Inactive";

        return `
            <tr
                data-name="${escapeHTML(member.full_name).toLowerCase()}"
                data-email="${escapeHTML(member.email).toLowerCase()}"
                data-department="${escapeHTML(member.department || "").toLowerCase()}"
                data-status="${escapeHTML(member.status)}"
            >
                <td>
                    <div style="display:flex;gap:10px;align-items:center">
                        <span class="user-avatar">
                            ${escapeHTML(initials)}
                        </span>

                        <div>
                            <b>${escapeHTML(member.full_name)}</b>

                            <div style="font-size:12px;color:#98A2B3;">
                                ${escapeHTML(member.email)}
                            </div>
                        </div>
                    </div>
                </td>

                <td>
                    ${escapeHTML(member.position || "-")}
                </td>

                <td>
                    ${escapeHTML(member.department || "-")}
                </td>

                <td>
                    <span class="badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>

                <td>
                    ${formatDate(member.created_at)}
                </td>

                <td class="actions">
                    <button
                        class="btn btn-sm btn-secondary"
                        data-action="view"
                        data-id="${member.id}"
                    >
                        View
                    </button>

                    <button
                        class="btn btn-sm btn-secondary"
                        data-action="edit"
                        data-id="${member.id}"
                    >
                        Edit
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    attachMemberActions();
}


/* ==========================================
   Member Actions
========================================== */

function attachMemberActions() {
    document
        .querySelectorAll("[data-action]")
        .forEach(button => {

            button.addEventListener("click", async () => {

                const memberId = button.dataset.id;
                const action = button.dataset.action;

                if (action === "view") {
                    await viewMember(memberId);
                }

                if (action === "edit") {
                    await editMember(memberId);
                }
            });
        });
}


/* ==========================================
   View Member
========================================== */

async function viewMember(memberId) {
    try {
        const response = await fetch(
            `${API_URL}/${memberId}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load member"
            );
        }

        const member = data.member;

        alert(
            `Member Details\n\n` +
            `Name: ${member.full_name}\n` +
            `Email: ${member.email}\n` +
            `Phone: ${member.phone || "-"}\n` +
            `Department: ${member.department || "-"}\n` +
            `Position: ${member.position || "-"}\n` +
            `Role: ${member.role}\n` +
            `Status: ${member.status}`
        );

    } catch (error) {
        console.error("❌ Failed to view member:", error);

        showToast(error.message);
    }
}


/* ==========================================
   Edit Member
========================================== */

async function editMember(memberId) {
    try {
        const response = await fetch(
            `${API_URL}/${memberId}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load member"
            );
        }

        const member = data.member;

        const fullName = prompt(
            "Full Name:",
            member.full_name
        );

        if (fullName === null) return;

        const position = prompt(
            "Position:",
            member.position || ""
        );

        if (position === null) return;

        const department = prompt(
            "Department:",
            member.department || ""
        );

        if (department === null) return;

        const status = prompt(
            "Status (active/inactive):",
            member.status
        );

        if (status === null) return;

        const updateResponse = await fetch(
            `${API_URL}/${memberId}`,
            {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name: fullName,
                    position,
                    department,
                    status
                })
            }
        );

        const updateData = await updateResponse.json();

        if (!updateResponse.ok) {
            throw new Error(
                updateData.message || "Failed to update member"
            );
        }

        showToast("Member updated successfully");

        await loadMembers();

    } catch (error) {
        console.error("❌ Failed to edit member:", error);

        showToast(error.message);
    }
}


/* ==========================================
   Search
========================================== */

function filterMembers() {
    const searchTerm =
        searchInput?.value.trim().toLowerCase() || "";

    const selectedDepartment =
        departmentSelect?.value.trim().toLowerCase() || "";

    const selectedStatus =
        statusSelect?.value.trim().toLowerCase() || "";

    document
        .querySelectorAll("table tbody tr")
        .forEach(row => {

            const name =
                row.dataset.name || "";

            const email =
                row.dataset.email || "";

            const department =
                row.dataset.department || "";

            const status =
                row.dataset.status || "";

            const matchesSearch =
                !searchTerm ||
                name.includes(searchTerm) ||
                email.includes(searchTerm);

            const matchesDepartment =
                !selectedDepartment ||
                selectedDepartment === "all departments" ||
                department === selectedDepartment;

            const matchesStatus =
                !selectedStatus ||
                selectedStatus === "all status" ||
                status === selectedStatus;

            row.style.display =
                matchesSearch &&
                matchesDepartment &&
                matchesStatus
                    ? ""
                    : "none";
        });
}


/* ==========================================
   Populate Department Filter
========================================== */

function populateDepartments(members) {
    if (!departmentSelect) return;

    const departments = [
        ...new Set(
            members
                .map(member => member.department)
                .filter(Boolean)
        )
    ].sort();

    departmentSelect.innerHTML = `
        <option>All Departments</option>
        ${departments.map(department => `
            <option value="${escapeHTML(department)}">
                ${escapeHTML(department)}
            </option>
        `).join("")}
    `;
}


/* ==========================================
   Initial Load
========================================== */

async function initializeMemberManagement() {
    await loadMembers();

    const rows = [...document.querySelectorAll("table tbody tr")];

    const members = rows.map(row => ({
        department: row.dataset.department
    }));

    // Department filter will be improved when Add Member
    // and server-side filtering are connected.
}


/* ==========================================
   Events
========================================== */

searchInput?.addEventListener(
    "input",
    filterMembers
);

departmentSelect?.addEventListener(
    "change",
    filterMembers
);

statusSelect?.addEventListener(
    "change",
    filterMembers
);

addMemberButton?.addEventListener(
    "click",
    () => {
        showToast(
            "Add Member form will be connected next"
        );
    }
);


/* ==========================================
   Mobile Sidebar
========================================== */

const toggle = document.querySelector(
    ".mobile-toggle"
);

const sidebar = document.querySelector(
    ".sidebar"
);

if (toggle && sidebar) {
    toggle.addEventListener(
        "click",
        () => sidebar.classList.toggle("open")
    );
}

document
    .querySelectorAll(".sidebar a")
    .forEach(link => {
        link.addEventListener(
            "click",
            () => sidebar?.classList.remove("open")
        );
    });


/* ==========================================
   Start
========================================== */

initializeMemberManagement();