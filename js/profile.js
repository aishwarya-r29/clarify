import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const nameInput = document.getElementById("full-name");
const deptInput = document.getElementById("department");
const yearInput = document.getElementById("year");
const bioInput = document.getElementById("bio");
const saveBtn = document.getElementById("save-profile");
const profileShell = document.getElementById("profile-shell");
const profileHeaderName = document.getElementById("profile-header-name");
const profileHeaderMeta = document.getElementById("profile-header-meta");
const profileAvatar = document.getElementById("profile-avatar");
const profileBio = document.getElementById("profile-bio");
const myPostsContainer = document.getElementById("my-posts");

let currentProfile = null;

// Utility: Format time for posts
function formatTime(iso) {
  if (!iso) return "";
  const created = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - created;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// Load user's posts
async function loadUserPosts(userId) {
  if (!myPostsContainer) return;

  myPostsContainer.innerHTML = '<div class="muted">Loading your posts...</div>';

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, post_replies(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    myPostsContainer.innerHTML = '<div class="muted">Error loading posts.</div>';
    return;
  }

  if (!posts || posts.length === 0) {
    myPostsContainer.innerHTML =
      '<div class="muted">You haven\'t posted anything yet. Start sharing on home page!</div>';
    return;
  }

  myPostsContainer.innerHTML = '';
  posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'card';
    postEl.style.marginBottom = '1rem';
    postEl.style.position = 'relative';
    postEl.style.zIndex = '1';

    const replies = post.post_replies || [];
    const isQuestion = post.type === 'question';

    postEl.innerHTML = `
      <header class="card-header">
        <div class="user-meta">
          <span class="user-meta-name">${post.title || (isQuestion ? 'Question' : 'Post')}</span>
          <span class="user-meta-sub">${formatTime(post.created_at)} · ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>
        </div>
        ${post.tag ? `<span class="card-chip">#${post.tag}</span>` : ''}
      </header>
      <div class="card-body">
        ${post.content ? post.content.substring(0, 150) + (post.content.length > 150 ? '...' : '') : ''}
      </div>
      <div class="card-footer">
        <span class="muted">${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>
      </div>
    `;

    myPostsContainer.appendChild(postEl);
  });
}

// Initialize profile page
async function initProfile() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
  }

  currentProfile = profile ? { ...profile, user_id: user.id, email: user.email } : { user_id: user.id, email: user.email };

  // Display profile info with letter avatar
  if (profile) {
    if (nameInput) {
      nameInput.value = profile.full_name || "";
    }
    if (deptInput) {
      deptInput.value = profile.department || "";
    }
    if (yearInput) {
      yearInput.value = profile.year || "";
    }
    if (bioInput) {
      bioInput.value = profile.bio || "";
    }
    if (profileShell) {
      profileHeaderName.textContent = profile.full_name || user.email;
      profileHeaderMeta.textContent =
        profile.department && profile.year
          ? `${profile.department} · ${profile.year}`
          : "PSG Tech student";
      profileBio.textContent = profile.bio || "No bio added yet.";
      
      // Always show first letter of name/email as avatar
      const avatarLetter = (profile.full_name || user.email || "C")[0].toUpperCase();
      profileAvatar.textContent = avatarLetter;
    }
  } else {
    // Profile setup page: keep form empty
    if (profileShell) {
      profileHeaderName.textContent = user.email;
      profileHeaderMeta.textContent = "Complete your profile to get started.";
      const avatarLetter = (user.email || "C")[0].toUpperCase();
      profileAvatar.textContent = avatarLetter;
    }
  }

  // Save profile button
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      console.log("Save button clicked");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        const fullName = nameInput?.value?.trim() || "";
        const department = deptInput?.value?.trim() || "";
        const year = yearInput?.value?.trim() || "";
        const bio = bioInput?.value?.trim() || "";

        if (!fullName || !department || !year) {
          alert("Please fill in Name, Department and Year.");
          saveBtn.disabled = false;
          saveBtn.textContent = "Save profile";
          return;
        }

        const upsertPayload = {
          user_id: user.id,
          email: user.email,
          full_name: fullName,
          department,
          year,
          bio,
        };

        console.log("Saving profile with payload:", upsertPayload);

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        let result;
        if (existingProfile) {
          console.log("Updating existing profile");
          result = await supabase
            .from("profiles")
            .update(upsertPayload)
            .eq("user_id", user.id);
        } else {
          console.log("Creating new profile");
          result = await supabase
            .from("profiles")
            .insert(upsertPayload);
        }

        const { error: upsertError } = result;

        if (upsertError) {
          console.error("Profile operation error:", upsertError);
          alert("Could not save profile. Error: " + (upsertError.message || "Unknown error"));
          saveBtn.disabled = false;
          saveBtn.textContent = "Save profile";
          return;
        }

        console.log("Profile saved successfully");

        // Update avatar after successful save
        const avatarLetter = (fullName || user.email || "C")[0].toUpperCase();
        if (profileAvatar) {
          profileAvatar.textContent = avatarLetter;
        }

        // Redirect if on setup page
        if (window.location.pathname.endsWith("profile-setup.html")) {
          console.log("Redirecting to home page");
          window.location.href = "./home.html";
        } else {
          alert("Profile updated.");
          window.location.reload();
        }
      } catch (error) {
        console.error("Unexpected error during profile save:", error);
        alert("An unexpected error occurred. Please try again.");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save profile";
      }
    });
  } else {
    console.error("Save button not found!");
  }

  // Load user posts
  await loadUserPosts(user.id);
}

document.addEventListener("DOMContentLoaded", initProfile);