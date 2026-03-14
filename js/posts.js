import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const feedContainer = document.getElementById("feed");
const composerText = document.getElementById("composer-text");
const postBtn = document.getElementById("post-btn");
const searchInput = document.getElementById("search-input");

let currentProfile = null;

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

function createPostCard(post, userId) {
  const wrapper = document.createElement("article");
  wrapper.className = "card";
  const initials = (post.author_name || post.author_email || "C")[0].toUpperCase();
  wrapper.innerHTML = `
    <header class="card-header">
      <div class="user-chip">
        <div class="avatar">
          ${post.author_avatar_url ? `<img src="${post.author_avatar_url}" alt="">` : initials}
        </div>
        <div class="user-meta">
          <span class="user-meta-name">${post.author_name || post.author_email}</span>
          <span class="user-meta-sub">
            ${post.department || "PSG Tech"}${post.year ? " · " + post.year : ""}
          </span>
        </div>
      </div>
      ${
        post.tag
          ? `<span class="card-chip">#${post.tag}</span>`
          : ""
      }
    </header>
    <div class="card-body">
      ${post.content ? post.content.replace(/\n/g, "<br>") : ""}
    </div>
    <footer class="card-footer">
      <span class="muted">${formatTime(post.created_at)}</span>
      <div class="card-actions">
        <button class="pill-button" data-like>
          <span>♥</span>
          <span>${post.likes_count || 0}</span>
        </button>
        <button class="pill-button" data-comment>
          <span>💬</span>
          <span>${post.comments_count || 0}</span>
        </button>
        ${
          post.user_id === userId
            ? `<button class="pill-button" data-delete>
                 <span>✕</span><span>Delete</span>
               </button>`
            : ""
        }
      </div>
    </footer>
  `;

  const likeBtn = wrapper.querySelector("[data-like]");
  const deleteBtn = wrapper.querySelector("[data-delete]");

  likeBtn?.addEventListener("click", async () => {
    // Minimal optimistic like: increment counter column
    const { error } = await supabase.rpc("increment_post_likes", {
      post_id_input: post.id,
    });
    if (error) console.error(error);
  });

  deleteBtn?.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) console.error(error);
  });

  return wrapper;
}

async function loadHomeFeed() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;

  // Load current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  currentProfile = profile;

  async function refreshFeed() {
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    const q = searchInput?.value.trim();
    if (q) {
      query = query.ilike("content", `%${q}%`);
    }

    const { data: posts, error } = await query;
    if (error) {
      console.error(error);
      return;
    }

    feedContainer.innerHTML = "";
    if (!posts || posts.length === 0) {
      feedContainer.innerHTML =
        '<div class="empty-state">No posts yet. Be the first to ask something!</div>';
      return;
    }

    posts.forEach((p) => {
      feedContainer.appendChild(createPostCard(p, user.id));
    });
  }

  await refreshFeed();

  searchInput?.addEventListener("input", () => {
    refreshFeed();
  });

  postBtn?.addEventListener("click", async () => {
    if (!composerText.value.trim()) return;
    const content = composerText.value.trim();
    const { error } = await supabase.from("posts").insert({
      content,
      user_id: user.id,
      author_email: user.email,
      author_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
      year: currentProfile?.year || null,
    });
    if (error) {
      console.error(error);
      alert("Could not post. Try again.");
      return;
    }
    composerText.value = "";
    await refreshFeed();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (feedContainer) loadHomeFeed();
});

