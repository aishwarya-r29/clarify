import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const nameInput = document.getElementById("full-name");
const deptInput = document.getElementById("department");
const yearInput = document.getElementById("year");
const bioInput = document.getElementById("bio");
const avatarInput = document.getElementById("avatar");
const saveBtn = document.getElementById("save-profile");
const profileShell = document.getElementById("profile-shell");
const profileHeaderName = document.getElementById("profile-header-name");
const profileHeaderMeta = document.getElementById("profile-header-meta");
const profileAvatar = document.getElementById("profile-avatar");
const profileBio = document.getElementById("profile-bio");

async function initProfile() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;

  // Load existing profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
  }

  if (profile) {
    if (nameInput) {
      nameInput.value = profile.full_name || "";
      deptInput.value = profile.department || "";
      yearInput.value = profile.year || "";
      bioInput.value = profile.bio || "";
    }

    if (profileShell) {
      profileHeaderName.textContent = profile.full_name || user.email;
      profileHeaderMeta.textContent =
        profile.department && profile.year
          ? `${profile.department} · ${profile.year}`
          : "PSG Tech student";
      profileBio.textContent = profile.bio || "No bio added yet.";
      if (profile.avatar_url) {
        profileAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Profile picture" />`;
      } else {
        profileAvatar.textContent = (profile.full_name || user.email)[0]?.toUpperCase() || "C";
      }
    }
  } else {
    // profile setup page: keep form empty
    if (profileShell) {
      profileHeaderName.textContent = user.email;
      profileHeaderMeta.textContent = "Complete your profile to get started.";
    }
  }

  saveBtn?.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      let avatarUrl = profile?.avatar_url || null;

      const fullName = nameInput.value.trim();
      const department = deptInput.value.trim();
      const year = yearInput.value.trim();
      const bio = bioInput.value.trim();

      if (!fullName || !department || !year) {
        alert("Please fill in Name, Department and Year.");
        return;
      }

      // Optional avatar upload (to Supabase storage bucket "avatars")
      const file = avatarInput?.files?.[0];
      if (file) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });
        if (uploadError) {
          console.error(uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          avatarUrl = publicUrlData.publicUrl;
        }
      }

      const upsertPayload = {
        user_id: user.id,
        full_name: fullName,
        department,
        year,
        bio,
        avatar_url: avatarUrl,
      };

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(upsertPayload, { onConflict: "user_id" });

      if (upsertError) {
        console.error(upsertError);
        alert("Could not save profile. Try again.");
        return;
      }

      // If coming from first login, redirect to home
      if (window.location.pathname.endsWith("profile-setup.html")) {
        window.location.href = "./home.html";
      } else {
        alert("Profile updated.");
        window.location.reload();
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save profile";
    }
  });
}

document.addEventListener("DOMContentLoaded", initProfile);

