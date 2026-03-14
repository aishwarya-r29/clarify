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
const myPostsContainer = document.getElementById("my-posts");

function formatTime(iso) {
  if (!iso) return "";
  const created = new Date(iso).getTime();
  const diff = Date.now() - created;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

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
    myPostsContainer.innerHTML = '<div class="muted">You haven\'t posted anything yet. Start sharing on the home page!</div>';
    return;
  }
  
  myPostsContainer.innerHTML = '';
  posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'card';
    postEl.style.marginBottom = '0.75rem';
    
    const replies = post.post_replies || [];
    postEl.innerHTML = `
      <header class="card-header">
        <div class="user-meta">
          <span class="user-meta-name">${post.title || 'Post'}</span>
          <span class="user-meta-sub">${formatTime(post.created_at)} · ${replies.length} replies</span>
        </div>
        ${post.tag ? `<span class="card-chip">#${post.tag}</span>` : ''}
      </header>
      <div class="card-body">
        ${post.content ? post.content.substring(0, 150) + (post.content.length > 150 ? '...' : '') : ''}
      </div>
      <div class="card-footer">
        <span class="muted">${post.likes_count || 0} likes · ${replies.length} replies</span>
      </div>
    `;
    
    myPostsContainer.appendChild(postEl);
  });
}

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
        email: user.email,
        full_name: fullName,
        department,
        year,
        bio,
        avatar_url: avatarUrl,
      };

      // First try to insert, if it fails due to constraint, then update
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
        
      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from("profiles")
          .update(upsertPayload)
          .eq("user_id", user.id);
      } else {
        // Insert new profile
        result = await supabase
          .from("profiles")
          .insert(upsertPayload);
      }
      
      const { error: upsertError } = result;

      if (upsertError) {
        console.error("Profile operation error:", upsertError);
        console.error("Error details:", JSON.stringify(upsertError, null, 2));
        console.error("Payload:", JSON.stringify(upsertPayload, null, 2));
        alert("Could not save profile. Error: " + (upsertError.message || "Unknown error") + "\nCheck console for details.");
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
  
  // Load user posts
  await loadUserPosts(user.id);
}

document.addEventListener("DOMContentLoaded", initProfile);

