import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const titleEl = document.getElementById("ask-title");
const descEl = document.getElementById("ask-desc");
const tagEl = document.getElementById("ask-tag");
const askBtn = document.getElementById("ask-btn");
const askSearch = document.getElementById("ask-search");
const askResults = document.getElementById("ask-results");

let allQuestions = [];
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

function createQuestionCard(question, userId, refreshQuestions) {
  const wrapper = document.createElement("article");
  wrapper.className = "card";
  const initials = (question.author_name || question.author_email || "C")[0].toUpperCase();
  const replies = question.post_replies || [];

  const repliesHtml =
    replies.length === 0
      ? '<div class="muted">No replies yet. Be the first to help!</div>'
      : replies
          .map(
            (r) => `
        <div class="reply-item" data-reply-id="${r.id}">
          <div class="reply-meta">
            <span class="reply-author">${r.author_name || r.author_email}</span>
            <span class="reply-sub">${r.department || ""}${r.year ? " · " + r.year : ""}</span>
            ${r.user_id === userId ? `<button class="pill-button" data-delete-reply style="margin-left: auto; padding: 0.2rem 0.5rem; font-size: 0.7rem;">✕</button>` : ""}
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
          ${question.author_avatar_url ? `<img src="${question.author_avatar_url}" alt="">` : initials}
        </div>
        <div class="user-meta">
          <span class="user-meta-name">${question.author_name || question.author_email}</span>
          <span class="user-meta-sub">
            ${question.department || "PSG Tech"}${question.year ? " · " + question.year : ""}
          </span>
        </div>
      </div>
      ${
        question.tag
          ? `<span class="card-chip">#${question.tag}</span>`
          : ""
      }
    </header>
    <div class="card-body">
      <strong>${question.title}</strong><br/>
      ${question.content ? question.content.replace(/\n/g, "<br>") : ""}
    </div>
    <footer class="card-footer">
      <span class="muted">${formatTime(question.created_at)}</span>
      <div class="card-actions">
        <button class="pill-button" data-upvote>
          <span>👍</span>
          <span>${question.upvotes_count || 0}</span>
        </button>
        <button class="pill-button" data-comment>
          <span>💬</span>
          <span>${replies.length}</span>
        </button>
        ${
          question.user_id === userId
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
        <input type="text" placeholder="Reply to this question..." data-reply-input />
        <button type="button" class="pill-button" data-reply-submit>
          <span>➤</span><span>Reply</span>
        </button>
      </div>
    </div>
  `;

  const upvoteBtn = wrapper.querySelector("[data-upvote]");
  const deleteBtn = wrapper.querySelector("[data-delete]");
  const replyInput = wrapper.querySelector("[data-reply-input]");
  const replySubmit = wrapper.querySelector("[data-reply-submit]");
  const deleteReplyBtns = wrapper.querySelectorAll("[data-delete-reply]");

  upvoteBtn?.addEventListener("click", async () => {
    // Check if user already upvoted this question
    const { data: userUpvote } = await supabase
      .from("question_upvotes")
      .select("*")
      .eq("question_id", question.id)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (userUpvote) {
      // Remove upvote
      await supabase.from("question_upvotes").delete().eq("id", userUpvote.id);
      await supabase
        .from("posts")
        .update({ upvotes_count: Math.max(0, (question.upvotes_count || 0) - 1) })
        .eq("id", question.id);
    } else {
      // Add upvote
      await supabase.from("question_upvotes").insert({
        question_id: question.id,
        user_id: userId
      });
      await supabase
        .from("posts")
        .update({ upvotes_count: (question.upvotes_count || 0) + 1 })
        .eq("id", question.id);
    }
    
    // Immediate UI update
    const { data: upvotesData } = await supabase
      .from("question_upvotes")
      .select("*")
      .eq("question_id", question.id);
    
    const newCount = upvotesData?.length || 0;
    const isVoted = upvotesData?.some(u => u.user_id === userId);
    
    upvoteBtn.querySelector('span:last-child').textContent = newCount;
    // No color change - keep consistent styling
    
    // Update question object
    question.upvotes_count = newCount;
    question.question_upvotes = upvotesData || [];
  });

  deleteBtn?.addEventListener("click", async () => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", question.id);
    if (error) console.error(error);
    else refreshQuestions();
  });

  replySubmit?.addEventListener("click", async () => {
    const value = replyInput.value.trim();
    if (!value) return;
    
    const { data: newReply, error } = await supabase
      .from("post_replies")
      .insert({
        post_id: question.id,
        user_id: userId,
        content: value,
        author_email: currentProfile?.email || question.author_email,
        author_name: currentProfile?.full_name || null,
        department: currentProfile?.department || null,
        year: currentProfile?.year || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error(error);
      alert("Could not add reply.");
      return;
    }
    
    replyInput.value = "";
    
    // Add reply to UI immediately
    const repliesList = wrapper.querySelector(".replies-list");
    const emptyState = repliesList.querySelector(".muted");
    if (emptyState) emptyState.remove();
    
    const replyEl = document.createElement("div");
    replyEl.className = "reply-item";
    replyEl.dataset.replyId = newReply.id;
    replyEl.innerHTML = `
      <div class="reply-meta">
        <span class="reply-author">${newReply.author_name || newReply.author_email}</span>
        <span class="reply-sub">${newReply.department || ""}${newReply.year ? " · " + newReply.year : ""}</span>
        <button class="pill-button" data-delete-reply style="margin-left:auto; font-size:0.7rem;">✕</button>
      </div>
      <div class="reply-text">${newReply.content.replace(/\n/g, "<br>")}</div>
      <div class="reply-time">${formatTime(newReply.created_at)}</div>
    `;
    repliesList.appendChild(replyEl);
    
    // Add delete listener to new reply
    replyEl.querySelector("[data-delete-reply]")?.addEventListener("click", async () => {
      if (!confirm("Delete this reply?")) return;
      const { error } = await supabase.from("post_replies").delete().eq("id", newReply.id);
      if (!error) replyEl.remove();
      else console.error(error);
    });
    
    // Update comment count
    const commentBtn = wrapper.querySelector("[data-comment] span:last-child");
    const currentCount = parseInt(commentBtn.textContent) || 0;
    commentBtn.textContent = currentCount + 1;
  });

  deleteReplyBtns.forEach(btn => {
    btn?.addEventListener("click", async () => {
      const replyItem = btn.closest(".reply-item");
      const replyId = replyItem.dataset.replyId;
      if (!confirm("Delete this reply?")) return;
      const { error } = await supabase.from("post_replies").delete().eq("id", replyId);
      if (!error) {
        replyItem.remove();
        // Update comment count
        const commentBtn = wrapper.querySelector("[data-comment] span:last-child");
        const currentCount = parseInt(commentBtn.textContent) || 0;
        commentBtn.textContent = Math.max(0, currentCount - 1);
      } else {
        console.error(error);
      }
    });
  });

  return wrapper;
}

async function refreshQuestions() {
  const q = askSearch.value.trim();
  let query = supabase
    .from("posts")
    .select("*, post_replies(*)")
    .eq("type", "question")
    .order("created_at", { ascending: false });

  if (q) {
    const term = `%${q}%`;
    query = query.or(
      `title.ilike.${term},content.ilike.${term},tag.ilike.${term},department.ilike.${term}`
    );
  }

  const { data: questions, error } = await query.limit(20);
  if (error) {
    console.error(error);
    return;
  }

  askResults.innerHTML = "";
  if (!questions || questions.length === 0) {
    askResults.innerHTML =
      '<div class="empty-state">' + (q ? 'No matching questions found.' : 'No questions yet. Be the first to ask!') + '</div>';
    return;
  }

  questions.forEach((question) => {
    askResults.appendChild(createQuestionCard(question, currentProfile?.user_id || null, refreshQuestions));
  });
}

async function initAsk() {
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
    ? { ...profile, user_id: user.id, email: user.email }
    : { user_id: user.id, email: user.email };

  askBtn.addEventListener("click", async () => {
    if (!titleEl.value.trim() || !descEl.value.trim()) {
      alert("Title and description are required.");
      return;
    }

    const { error } = await supabase.from("posts").insert({
      title: titleEl.value.trim(),
      content: descEl.value.trim(),
      tag: tagEl.value.trim() || null,
      type: "question",
      user_id: user.id,
      author_email: user.email,
      author_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
      year: currentProfile?.year || null,
    });

    if (error) {
      console.error(error);
      alert("Could not post question.");
      return;
    }

    titleEl.value = "";
    descEl.value = "";
    tagEl.value = "";
    alert("Question posted successfully!");
    refreshQuestions();
  });

  askSearch?.addEventListener("input", () => {
    refreshQuestions();
  });

  await refreshQuestions();
}

document.addEventListener("DOMContentLoaded", initAsk);
