/* ==========================================
   PrimeIt — Role & Permissions
   Step 5.9.9.14.7
========================================== */

const API_URL = "/api/roles";


/* ==========================================
   Load Roles
========================================== */

async function loadRoles() {

  try {

    const response = await fetch(
      API_URL,
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Failed to load roles"
      );
    }

    renderRoles(data.roles);

  } catch (error) {

    console.error(
      "Load roles error:",
      error
    );

    showToast(
      error.message ||
      "Failed to load roles"
    );
  }
}


/* ==========================================
   Render Roles
========================================== */

function renderRoles(roles) {

  const roleList =
    document.querySelector(".role-list");

  if (!roleList) {
    return;
  }

  roleList.innerHTML = "";


  roles.forEach((role, index) => {

    const item =
      document.createElement("div");

    item.className =
      "role-item" +
      (index === 0 ? " active" : "");

    item.dataset.roleId = role.id;

    item.textContent =
      formatRoleName(role.name);

    roleList.appendChild(item);

  });


  const createButton =
    document.createElement("button");

  createButton.className =
    "btn btn-primary";

  createButton.style.width = "100%";
  createButton.style.marginTop = "12px";

  createButton.type = "button";

  createButton.textContent =
    "+ Create Role";

  createButton.dataset.toast =
    "Create role dialog opened";

  roleList.appendChild(createButton);


  attachRoleSelection();
  attachToastButtons();
}


/* ==========================================
   Format Role Name
========================================== */

function formatRoleName(roleName) {

  return roleName
    .split("_")
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");

}


/* ==========================================
   Role Selection
========================================== */

function attachRoleSelection() {

  document
    .querySelectorAll(".role-item")
    .forEach(item => {

      item.addEventListener(
        "click",
        async () => {

          document
            .querySelectorAll(".role-item")
            .forEach(role =>
              role.classList.remove("active")
            );

          item.classList.add("active");

          const roleId =
            item.dataset.roleId;

          console.log(
            "Selected role:",
            roleId
          );

          await loadRolePermissions(roleId);
        }
      );

    });

}

/* ==========================================
   Load Role Permissions
========================================== */

async function loadRolePermissions(roleId) {

  try {

    const response = await fetch(
      `${API_URL}/${roleId}/permissions`,
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Failed to load role permissions"
      );
    }

    console.log(
      "Role:",
      data.role
    );

    console.log(
      "Permissions:",
      data.permissions
    );

    renderRolePermissions(
      data.role,
      data.permissions
    );

  } catch (error) {

    console.error(
      "Load role permissions error:",
      error
    );

    showToast(
      error.message ||
      "Failed to load role permissions"
    );
  }
}

/* ==========================================
   Render Role Permissions
========================================== */

function renderRolePermissions(
    role,
    permissions
) {

    const roleName =
        document.querySelector(
            "#selected-role-name"
        );

    const roleDescription =
        document.querySelector(
            "#selected-role-description"
        );

    const permissionGrid =
        document.querySelector(
            "#permission-grid"
        );


    if (!roleName || !roleDescription || !permissionGrid) {
        return;
    }


    roleName.textContent =
        formatRoleName(role.name);

    roleDescription.textContent =
        role.description ||
        "Assigned permissions";


    permissionGrid.innerHTML = "";


    const permissionHeader =
        document.createElement("div");

    permissionHeader.className = "head";

    permissionHeader.textContent =
        "Permission";


    const statusHeader =
        document.createElement("div");

    statusHeader.className = "head";

    statusHeader.textContent =
        "Status";


    permissionGrid.appendChild(
        permissionHeader
    );

    permissionGrid.appendChild(
        statusHeader
    );


    permissions.forEach(permission => {

        const name =
            document.createElement("div");

        name.textContent =
            formatPermissionName(
                permission.name
            );


        const status =
            document.createElement("div");

        status.textContent =
            "✓ Assigned";

        status.className =
            "permission-status";


        permissionGrid.appendChild(name);

        permissionGrid.appendChild(status);

    });


    if (permissions.length === 0) {

        const message =
            document.createElement("div");

        message.textContent =
            role.name === "ceo" ||
            role.name === "developer"
                ? "Full access"
                : "No permissions assigned";

        message.style.gridColumn =
            "1 / -1";

        permissionGrid.appendChild(
            message
        );
    }
}


/* ==========================================
   Format Permission Name
========================================== */

function formatPermissionName(
    permissionName
) {

    return permissionName
        .split("_")
        .map(word =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(" ");

}


/* ==========================================
   Toast
========================================== */

function showToast(message) {

  let toast =
    document.querySelector(".toast");

  if (!toast) {

    toast =
      document.createElement("div");

    toast.className = "toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 2200);
}


function attachToastButtons() {

  document
    .querySelectorAll("[data-toast]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showToast(
            button.dataset.toast ||
            "Action completed"
          );

        }
      );

    });
}


/* ==========================================
   Mobile Sidebar
========================================== */

const toggle =
  document.querySelector(".mobile-toggle");

const sidebar =
  document.querySelector(".sidebar");

if (toggle && sidebar) {

  toggle.addEventListener(
    "click",
    () => {

      sidebar.classList.toggle("open");

    }
  );
}


document
  .querySelectorAll(".sidebar a")
  .forEach(link => {

    link.addEventListener(
      "click",
      () => {

        sidebar?.classList.remove("open");

      }
    );

  });


/* ==========================================
   Initialize
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadRoles();

  }
);