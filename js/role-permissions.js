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

    item.dataset.roleName = role.name;

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

    /*
     * Load the selected role's currently assigned permissions.
     */

    const roleResponse = await fetch(
      `${API_URL}/${roleId}/permissions`,
      {
        credentials: "include"
      }
    );


    const roleData =
      await roleResponse.json();


    if (!roleResponse.ok) {

      throw new Error(
        roleData.message ||
        "Failed to load role permissions"
      );
    }


    /*
     * Load all available permissions.
     */

    const permissionsResponse =
      await fetch(
        `${API_URL}/permissions/all`,
        {
          credentials: "include"
        }
      );


    const permissionsData =
      await permissionsResponse.json();


    if (!permissionsResponse.ok) {

      throw new Error(
        permissionsData.message ||
        "Failed to load permissions"
      );
    }


    /*
     * Store all permissions globally so
     * renderRolePermissions() can use them.
     */

    window.allPrimeItPermissions =
      permissionsData.permissions || [];


    /*
     * Render the selected role.
     */

    renderRolePermissions(
      roleData.role,
      roleData.permissions || []
    );


    console.log(
      "Selected role:",
      roleData.role
    );

    console.log(
      "Assigned permissions:",
      roleData.permissions || []
    );

    console.log(
      "All permissions:",
      window.allPrimeItPermissions
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

function renderRolePermissions(role, permissions) {

  const roleNameElement =
    document.getElementById("selected-role-name");

  const roleDescriptionElement =
    document.getElementById("selected-role-description");

  const permissionGrid =
    document.getElementById("permission-grid");

  const saveButton =
    document.getElementById("save-permissions-btn");


  if (!roleNameElement || !roleDescriptionElement || !permissionGrid) {
    return;
  }


  roleNameElement.textContent =
    formatRoleName(role.name);

  roleDescriptionElement.textContent =
    role.description || "Role permissions";


  /*
   * CEO and Developer have automatic full access.
   */

  const fullAccess =
    role.name === "ceo" ||
    role.name === "developer";


  /*
   * Convert assigned permissions into a Set
   * for quick checkbox lookup.
   */

  const assignedPermissionIds =
    new Set(
      permissions.map(
        permission => Number(permission.id)
      )
    );


  /*
   * Clear existing permission rows.
   */

  permissionGrid.innerHTML = "";


  /*
   * Header
   */

  const permissionHeader =
    document.createElement("div");

  permissionHeader.className = "head";
  permissionHeader.textContent = "Permission";


  const statusHeader =
    document.createElement("div");

  statusHeader.className = "head";
  statusHeader.textContent = "Assigned";


  permissionGrid.appendChild(permissionHeader);
  permissionGrid.appendChild(statusHeader);


  /*
   * Full-access roles
   */

  if (fullAccess) {

    const message =
      document.createElement("div");

    message.className = "permission-full-access";
    message.style.gridColumn = "1 / -1";
    message.textContent =
      "✓ Full access — automatically granted";

    permissionGrid.appendChild(message);


    if (saveButton) {
      saveButton.disabled = true;
      saveButton.style.display = "none";
    }

    return;
  }


  /*
   * Normal roles.
   */

  if (saveButton) {
    saveButton.disabled = false;
    saveButton.style.display = "";
  }


  /*
   * All permissions must be loaded before
   * this function is called.
   */

  if (!window.allPrimeItPermissions) {

    const message =
      document.createElement("div");

    message.style.gridColumn = "1 / -1";
    message.textContent =
      "Unable to load permission definitions.";

    permissionGrid.appendChild(message);

    return;
  }


  window.allPrimeItPermissions.forEach(
    permission => {

      const permissionCell =
        document.createElement("div");

      permissionCell.className =
        "permission-name";


      const name =
        document.createElement("strong");

      name.textContent =
        formatPermissionName(
          permission.name
        );


      const description =
        document.createElement("small");

      description.textContent =
        permission.description || "";


      permissionCell.appendChild(name);
      permissionCell.appendChild(description);


      const statusCell =
        document.createElement("div");

      statusCell.className =
        "permission-status";


      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";

      checkbox.className =
        "permission-checkbox";

      checkbox.dataset.permissionId =
        permission.id;

      checkbox.checked =
        assignedPermissionIds.has(
          Number(permission.id)
        );


      statusCell.appendChild(checkbox);


      permissionGrid.appendChild(permissionCell);
      permissionGrid.appendChild(statusCell);
    }
  );
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

/* ==========================================
   CREATE ROLE DIALOG
========================================== */

function openCreateRoleDialog() {

  if (document.getElementById("create-role-modal")) {
    return;
  }


  const modal =
    document.createElement("div");

  modal.id =
    "create-role-modal";

  modal.className =
    "role-modal";


  modal.innerHTML = `
        <div class="role-modal-backdrop"></div>

        <div class="role-modal-card">

            <div class="role-modal-header">

                <div>
                    <h2>Create Role</h2>
                    <p>
                        Create a custom role for PrimeIt.
                    </p>
                </div>

                <button
                    type="button"
                    class="role-modal-close"
                    id="close-create-role"
                >
                    ×
                </button>

            </div>


            <form id="create-role-form">

                <div class="form-group">

                    <label for="create-role-name">
                        Role Name
                    </label>

                    <input
                        type="text"
                        id="create-role-name"
                        name="name"
                        placeholder="Marketing Manager"
                        maxlength="50"
                        required
                    >

                    <small>
                        Example: Marketing Manager
                    </small>

                </div>


                <div class="form-group">

                    <label for="create-role-description">
                        Description
                    </label>

                    <textarea
                        id="create-role-description"
                        name="description"
                        placeholder="Manages marketing activities and campaigns"
                        maxlength="255"
                        rows="4"
                    ></textarea>

                </div>


                <div class="role-modal-actions">

                    <button
                        type="button"
                        class="btn"
                        id="cancel-create-role"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                        id="submit-create-role"
                    >
                        Create Role
                    </button>

                </div>

            </form>

        </div>
    `;


  document.body.appendChild(modal);


  const closeButton =
    document.getElementById(
      "close-create-role"
    );

  const cancelButton =
    document.getElementById(
      "cancel-create-role"
    );

  const backdrop =
    modal.querySelector(
      ".role-modal-backdrop"
    );


  function closeModal() {

    modal.remove();

  }


  closeButton.addEventListener(
    "click",
    closeModal
  );

  cancelButton.addEventListener(
    "click",
    closeModal
  );

  backdrop.addEventListener(
    "click",
    closeModal
  );


  const form =
    document.getElementById(
      "create-role-form"
    );


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const nameInput =
        document.getElementById(
          "create-role-name"
        );

      const descriptionInput =
        document.getElementById(
          "create-role-description"
        );

      const submitButton =
        document.getElementById(
          "submit-create-role"
        );


      const name =
        nameInput.value.trim();

      const description =
        descriptionInput.value.trim();


      if (!name) {

        showToast(
          "Role name is required."
        );

        nameInput.focus();

        return;
      }


      try {

        submitButton.disabled =
          true;

        submitButton.textContent =
          "Creating...";


        const response =
          await fetch(
            API_URL,
            {
              method: "POST",

              credentials: "include",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                name,
                description
              })
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to create role"
          );
        }


        showToast(
          data.message ||
          "Role created successfully"
        );


        closeModal();


        await loadRoles();


      } catch (error) {

        console.error(
          "Create role error:",
          error
        );

        showToast(
          error.message ||
          "Failed to create role"
        );


      } finally {

        if (
          document.body.contains(
            submitButton
          )
        ) {

          submitButton.disabled =
            false;

          submitButton.textContent =
            "Create Role";
        }

      }

    }
  );


  const roleNameInput =
    document.getElementById(
      "create-role-name"
    );

  if (roleNameInput) {
    roleNameInput.focus();
  }

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


  const createRoleButton =
    document.querySelector(
      ".role-list .btn-primary"
    );


  if (createRoleButton) {

    createRoleButton.addEventListener(
      "click",
      () => {

        openCreateRoleDialog();

      }
    );

  }

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


    const savePermissionsButton =
      document.getElementById("save-permissions-btn");

    if (savePermissionsButton) {

      savePermissionsButton.addEventListener(
        "click",
        async () => {

          const activeRole =
            document.querySelector(
              ".role-item.active"
            );

          if (!activeRole) {
            showToast("Please select a role first.");
            return;
          }


          const roleId =
            activeRole.dataset.roleId;


          const roleName =
            activeRole.dataset.roleName;


          /*
           * CEO and Developer cannot have their
           * permissions manually changed.
           */

          if (
            roleName === "ceo" ||
            roleName === "developer"
          ) {
            showToast(
              "CEO and Developer already have full access."
            );

            return;
          }


          /*
           * Collect checked permissions.
           */

          const checkedPermissions =
            Array.from(
              document.querySelectorAll(
                ".permission-checkbox:checked"
              )
            ).map(
              checkbox =>
                Number(
                  checkbox.dataset.permissionId
                )
            );


          console.log(
            "Saving permissions:",
            checkedPermissions
          );


          try {

            savePermissionsButton.disabled = true;

            savePermissionsButton.textContent =
              "Saving...";


            const response =
              await fetch(
                `${API_URL}/${roleId}/permissions`,
                {
                  method: "PUT",

                  credentials: "include",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body: JSON.stringify({
                    permissions:
                      checkedPermissions
                  })
                }
              );


            const data =
              await response.json();


            if (!response.ok) {

              throw new Error(
                data.message ||
                "Failed to save permissions"
              );
            }


            showToast(
              data.message ||
              "Permissions saved successfully"
            );


            /*
             * Reload the role permissions so
             * the UI reflects the database.
             */

            await loadRolePermissions(
              roleId
            );


          } catch (error) {

            console.error(
              "Save permissions error:",
              error
            );

            showToast(
              error.message ||
              "Failed to save permissions"
            );

          } finally {

            savePermissionsButton.disabled =
              false;

            savePermissionsButton.textContent =
              "Save Changes";
          }
        }
      );
    }




    loadRoles();

  }
);