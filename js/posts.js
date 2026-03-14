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

function createPostCard(post, userId, refreshFeed) {
  const wrapper = document.createElement("article");
  wrapper.className = "card";
  const initials = (post.author_name || post.author_email || "C")[0].toUpperCase();
  const replies = post.post_replies || [];

  const repliesHtml =
    replies.length === 0
      ? '<div class="muted">No replies yet. Start the conversation.</div>'
      : replies
          .map(
            (r) => `
        <div class="reply-item">
          <div class="reply-meta">
            <span class="reply-author">${r.author_name || r.author_email}</span>
            <span class="reply-sub">${r.department || ""}${r.year ? " · " + r.year : ""}</span>
          </div>
          <div class="reply-text">${r.content.replace(/\n/g, "<br>")}</div>
          <div class="reply-time">${formatTime(r.created_at)}</div>
        </div>
      `
          )
          .join("");

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
      ${post.title ? `<strong>${post.title}</strong><br/>` : ""}
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
          <span>${post.comments_count || replies.length || 0}</span>
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
    <div class="replies">
      <div class="replies-list">
        ${repliesHtml}
      </div>
      <div class="reply-composer">
        <input type="text" placeholder="Reply to this post..." data-reply-input />
        <button type="button" class="pill-button" data-reply-submit>
          <span>➤</span><span>Reply</span>
        </button>
      </div>
    </div>
  `;

  const likeBtn = wrapper.querySelector("[data-like]");
  const deleteBtn = wrapper.querySelector("[data-delete]");
  const replyInput = wrapper.querySelector("[data-reply-input]");
  const replySubmit = wrapper.querySelector("[data-reply-submit]");

  likeBtn?.addEventListener("click", async () => {
    const { error } = await supabase
      .from("posts")
      .update({ likes_count: (post.likes_count || 0) + 1 })
      .eq("id", post.id);
    if (error) {
      console.error(error);
      return;
    }
    refreshFeed();
  });

  deleteBtn?.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) console.error(error);
    else refreshFeed();
  });

  replySubmit?.addEventListener("click", async () => {
    const value = replyInput.value.trim();
    if (!value) return;
    const { error } = await supabase.from("post_replies").insert({
      post_id: post.id,
      user_id: userId,
      content: value,
      author_email: currentProfile?.email || post.author_email,
      author_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
      year: currentProfile?.year || null,
    });
    if (error) {
      console.error(error);
      alert("Could not add reply.");
      return;
    }
    replyInput.value = "";
    refreshFeed();
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
  currentProfile = profile
    ? { ...profile, email: user.email }
    : { email: user.email };

  async function refreshFeed() {
    let query = supabase
      .from("posts")
      .select("*, post_replies(*)")
      .order("created_at", { ascending: false });

    const q = searchInput?.value.trim();
    if (q) {
      const term = `%${q}%`;
      query = query.or(
        `content.ilike.${term},title.ilike.${term},tag.ilike.${term},department.ilike.${term}`
      );
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
      feedContainer.appendChild(createPostCard(p, user.id, refreshFeed));
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


