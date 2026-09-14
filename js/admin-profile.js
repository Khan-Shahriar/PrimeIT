document.addEventListener("DOMContentLoaded", () => {

  const profileForm = document.querySelector("#profile-form");
  const passwordForm = document.querySelector("#password-form");
  const logoutButton = document.querySelector("#logout-btn");
  const profilePhotoInput =
    document.querySelector("#profile-photo-input");

  const fullNameInput = document.querySelector("#full-name");
  const emailInput = document.querySelector("#email");
  const phoneInput = document.querySelector("#phone");
  const bioInput = document.querySelector("#bio");

  const profileName = document.querySelector("#profile-name");
  const profileRole = document.querySelector("#profile-role");
  const profileEmail = document.querySelector("#profile-email");

  const profileAvatar = document.querySelector("#profile-avatar");
  const topbarUserName = document.querySelector("#topbar-user-name");
  const topbarUserAvatar = document.querySelector("#topbar-user-avatar");

  const saveProfileButton =
    document.querySelector("#save-profile-btn");

  const changePasswordButton =
    document.querySelector("#change-password-btn");


  /* =========================================================
     HELPERS
  ========================================================= */

  function getInitials(name) {

    if (!name) {
      return "AD";
    }

    const words = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 1) {
      return words[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toUpperCase();
  }


  function showMessage(message) {
    alert(message);
  }


  /* =========================================================
     LOAD CURRENT USER
  ========================================================= */
  profilePhotoInput?.addEventListener(
    "change",
    async () => {
      const file = profilePhotoInput.files?.[0];

      if (!file) {
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!allowedTypes.includes(file.type)) {
        showMessage(
          "Only JPG, PNG, and WEBP images are allowed."
        );

        profilePhotoInput.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showMessage(
          "Profile photo must be 2 MB or smaller."
        );

        profilePhotoInput.value = "";
        return;
      }

      const formData = new FormData();

      formData.append(
        "profile_photo",
        file
      );

      try {
        const response = await fetch(
          "/api/auth/me/photo",
          {
            method: "POST",
            credentials: "include",
            body: formData
          }
        );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
            "Unable to upload profile photo."
          );
        }

        showMessage(
          "Profile photo uploaded successfully."
        );

        profilePhotoInput.value = "";

      } catch (error) {
        console.error(
          "Profile photo upload error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to upload profile photo."
        );
      }
    }
  );

  async function loadCurrentUser() {

    try {

      const response = await fetch(
        "/api/auth/me",
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        if (response.status === 401) {
          window.location.href =
            "/admin/admin-login.html";

          return;
        }

        throw new Error(
          data.message ||
          "Unable to load profile."
        );
      }

      const user = data.user;

      const initials =
        getInitials(user.full_name);


      /* =========================
         PROFILE FORM
      ========================== */

      fullNameInput.value =
        user.full_name || "";

      emailInput.value =
        user.email || "";

      phoneInput.value =
        user.phone || "";

      bioInput.value =
        user.bio || "";


      /* =========================
         PROFILE SUMMARY
      ========================== */

      profileName.textContent =
        user.full_name || "Administrator";

      profileRole.textContent =
        user.role || "member";

      profileEmail.textContent =
        user.email || "";


      /* =========================
         AVATARS
      ========================== */

      if (user.profile_photo) {
        profileAvatar.textContent = "";

        profileAvatar.style.backgroundImage =
          `url("${user.profile_photo}")`;

        profileAvatar.style.backgroundSize =
          "cover";

        profileAvatar.style.backgroundPosition =
          "center";

        profileAvatar.style.backgroundRepeat =
          "no-repeat";

        topbarUserAvatar.textContent = "";

        topbarUserAvatar.style.backgroundImage =
          `url("${user.profile_photo}")`;

        topbarUserAvatar.style.backgroundSize =
          "cover";

        topbarUserAvatar.style.backgroundPosition =
          "center";

        topbarUserAvatar.style.backgroundRepeat =
          "no-repeat";

      } else {
        profileAvatar.style.backgroundImage =
          "none";

        profileAvatar.textContent =
          initials;

        topbarUserAvatar.style.backgroundImage =
          "none";

        topbarUserAvatar.textContent =
          initials;
      }

      topbarUserName.textContent =
        user.full_name || "Administrator";


    } catch (error) {

      console.error(
        "Load profile error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to load profile."
      );
    }
  }


  /* =========================================================
     UPDATE PROFILE
  ========================================================= */

  profileForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const fullName =
        fullNameInput.value.trim();

      const phone =
        phoneInput.value.trim();

      const bio =
        bioInput.value.trim();


      if (fullName.length < 2) {

        showMessage(
          "Full name must be at least 2 characters."
        );

        return;
      }


      const originalText =
        saveProfileButton.textContent;

      saveProfileButton.disabled = true;

      saveProfileButton.textContent =
        "Saving...";


      try {

        const response = await fetch(
          "/api/auth/me",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              full_name: fullName,
              phone,
              bio
            })
          }
        );

        const data =
          await response.json();


        if (!response.ok || !data.success) {

          throw new Error(
            data.message ||
            "Unable to update profile."
          );
        }


        const user = data.user;

        const initials =
          getInitials(user.full_name);

        profileName.textContent =
          user.full_name;

        profileEmail.textContent =
          user.email;

        profileRole.textContent =
          user.role;

        if (user.profile_photo) {
          profileAvatar.textContent = "";

          profileAvatar.style.backgroundImage =
            `url("${user.profile_photo}")`;

          profileAvatar.style.backgroundSize =
            "cover";

          profileAvatar.style.backgroundPosition =
            "center";

          profileAvatar.style.backgroundRepeat =
            "no-repeat";

          topbarUserAvatar.textContent = "";

          topbarUserAvatar.style.backgroundImage =
            `url("${user.profile_photo}")`;

          topbarUserAvatar.style.backgroundSize =
            "cover";

          topbarUserAvatar.style.backgroundPosition =
            "center";

          topbarUserAvatar.style.backgroundRepeat =
            "no-repeat";

        } else {
          profileAvatar.style.backgroundImage =
            "none";

          profileAvatar.textContent =
            initials;

          topbarUserAvatar.style.backgroundImage =
            "none";

          topbarUserAvatar.textContent =
            initials;
        }

        topbarUserName.textContent =
          user.full_name;


        showMessage(
          "Profile updated successfully."
        );


      } catch (error) {

        console.error(
          "Update profile error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to update profile."
        );

      } finally {

        saveProfileButton.disabled =
          false;

        saveProfileButton.textContent =
          originalText;
      }
    }
  );


  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */

  passwordForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const currentPassword =
        document.querySelector(
          "#current-password"
        ).value;

      const newPassword =
        document.querySelector(
          "#new-password"
        ).value;

      const confirmPassword =
        document.querySelector(
          "#confirm-password"
        ).value;


      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {

        showMessage(
          "Please fill in all password fields."
        );

        return;
      }


      if (newPassword !== confirmPassword) {

        showMessage(
          "New password and confirmation do not match."
        );

        return;
      }


      if (newPassword.length < 8) {

        showMessage(
          "New password must be at least 8 characters."
        );

        return;
      }


      const originalText =
        changePasswordButton.textContent;

      changePasswordButton.disabled =
        true;

      changePasswordButton.textContent =
        "Changing...";


      try {

        const response = await fetch(
          "/api/auth/me/password",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              current_password:
                currentPassword,

              new_password:
                newPassword
            })
          }
        );

        const data =
          await response.json();


        if (!response.ok || !data.success) {

          throw new Error(
            data.message ||
            "Unable to change password."
          );
        }


        passwordForm.reset();

        showMessage(
          "Password changed successfully."
        );


      } catch (error) {

        console.error(
          "Change password error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to change password."
        );

      } finally {

        changePasswordButton.disabled =
          false;

        changePasswordButton.textContent =
          originalText;
      }
    }
  );


  /* =========================================================
     LOGOUT
  ========================================================= */

  logoutButton?.addEventListener(
    "click",
    async (event) => {

      event.preventDefault();

      try {

        const response = await fetch(
          "/api/auth/logout",
          {
            method: "POST",
            credentials: "include"
          }
        );

        const data =
          await response.json();


        if (!response.ok || !data.success) {

          throw new Error(
            data.message ||
            "Logout failed."
          );
        }


        window.location.href =
          "/admin/admin-login.html";


      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

        showMessage(
          error.message ||
          "Unable to logout."
        );
      }
    }
  );


  /* =========================================================
     MOBILE SIDEBAR
  ========================================================= */

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
    .forEach((link) => {

      link.addEventListener(
        "click",
        () => {
          sidebar?.classList.remove("open");
        }
      );

    });


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  loadCurrentUser();

});