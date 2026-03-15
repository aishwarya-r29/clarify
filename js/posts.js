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
  const replies = post.post_replies || [];

  const repliesHtml =
    replies.length === 0
      ? '<div class="muted">No replies yet. Start the conversation.</div>'
      : replies
          .map(
            (r) => `
        <div class="reply-item" data-reply-id="${r.id}">
          <div class="reply-meta">
            <span class="reply-author">${r.author_name || r.author_email}</span>
            <span class="reply-sub">${r.department || ""}${r.year ? " · " + r.year : ""}</span>
            ${r.user_id === userId ? `<button class="pill-button" data-delete-reply style="margin-left:auto; font-size:0.7rem;">✕</button>` : ""}
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
      ${post.tag ? `<span class="card-chip">#${post.tag}</span>` : ""}
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
          <span>${post.post_likes?.length || 0}</span>
        </button>
        <button class="pill-button" data-comment>
          <span>💬</span>
          <span>${post.comments_count || replies.length || 0}</span>
        </button>
        ${post.user_id === userId ? `<button class="pill-button" data-delete><span>✕</span><span>Delete</span></button>` : ""}
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
  const deleteReplyBtns = wrapper.querySelectorAll("[data-delete-reply]");

  // --- Like/unlike per user ---
  likeBtn?.addEventListener("click", async () => {
    // Check if user already liked
    const { data: existing, error: checkError } = await supabase
      .from("post_likes")
      .select("*")
      .eq("post_id", post.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) return console.error(checkError);

    if (existing) {
      // Unlike
      const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
      if (error) return console.error(error);
    } else {
      // Like
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
      if (error) return console.error(error);
    }

    // Refresh like count
    const { data: likesData } = await supabase.from("post_likes").select("*").eq("post_id", post.id);
    likeBtn.querySelector("span:last-child").textContent = likesData?.length || 0;
  });

  // --- Delete post ---
  deleteBtn?.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) wrapper.remove();
    else console.error(error);
  });

  // --- Reply submit ---
  replySubmit?.addEventListener("click", async () => {
    const value = replyInput.value.trim();
    if (!value) return;
    const { data: newReply, error } = await supabase
      .from("post_replies")
      .insert({
        post_id: post.id,
        user_id: userId,
        content: value,
        author_email: currentProfile?.email || post.author_email,
        author_name: currentProfile?.full_name || null,
        department: currentProfile?.department || null,
        year: currentProfile?.year || null,
      })
      .select()
      .single();

    if (error) return console.error(error);

    const repliesList = wrapper.querySelector(".replies-list");
    const replyHtml = `
      <div class="reply-item" data-reply-id="${newReply.id}">
        <div class="reply-meta">
          <span class="reply-author">${newReply.author_name || newReply.author_email}</span>
          <span class="reply-sub">${newReply.department || ""}${newReply.year ? " · " + newReply.year : ""}</span>
          <button class="pill-button" data-delete-reply style="margin-left:auto; font-size:0.7rem;">✕</button>
        </div>
        <div class="reply-text">${newReply.content.replace(/\n/g, "<br>")}</div>
        <div class="reply-time">${formatTime(newReply.created_at)}</div>
      </div>`;
    repliesList.insertAdjacentHTML("beforeend", replyHtml);
    replyInput.value = "";

    // Add delete listener to new reply
    repliesList.querySelector("[data-delete-reply]:last-child")?.addEventListener("click", async (e) => {
      const replyItem = e.target.closest(".reply-item");
      const replyId = replyItem.dataset.replyId;
      if (!confirm("Delete this reply?")) return;
      const { error } = await supabase.from("post_replies").delete().eq("id", replyId);
      if (!error) replyItem.remove();
      else console.error(error);
    });
  });

  // --- Delete existing replies ---
  deleteReplyBtns.forEach(btn => {
    btn?.addEventListener("click", async () => {
      const replyItem = btn.closest(".reply-item");
      const replyId = replyItem.dataset.replyId;
      if (!confirm("Delete this reply?")) return;
      const { error } = await supabase.from("post_replies").delete().eq("id", replyId);
      if (!error) replyItem.remove();
      else console.error(error);
    });
  });

  return wrapper;
}

async function loadHomeFeed() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  currentProfile = profile ? { ...profile, email: user.email } : { email: user.email };

  async function refreshFeed() {
    let query = supabase
      .from("posts")
      .select("*, post_replies(*), post_likes(*)")
      .or("type.is.null,type.neq.question")
      .order("created_at", { ascending: false });

    const q = searchInput?.value.trim();
    if (q) {
      const term = `%${q}%`;
      query = query.or(
        `content.ilike.${term},title.ilike.${term},tag.ilike.${term},department.ilike.${term}`
      );
    }

    const { data: posts, error } = await query;
    if (error) return console.error(error);

    feedContainer.innerHTML = "";
    if (!posts || posts.length === 0) {
      feedContainer.innerHTML =
        '<div class="empty-state">No posts yet. Be the first to share something!</div>';
      return;
    }

    posts.forEach(p => feedContainer.appendChild(createPostCard(p, user.id)));
  }

  await refreshFeed();

  searchInput?.addEventListener("input", () => refreshFeed());

  postBtn?.addEventListener("click", async () => {
    if (!composerText.value.trim()) return;
    const content = composerText.value.trim();
    const { error } = await supabase.from("posts").insert({
      content,
      type: "general",
      user_id: user.id,
      author_email: user.email,
      author_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
      year: currentProfile?.year || null,
    });
    if (error) return console.error(error);
    composerText.value = "";
    await refreshFeed();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (feedContainer) loadHomeFeed();
});