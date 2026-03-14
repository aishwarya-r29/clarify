import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const resourcesList = document.getElementById("resources-list");
const resTitle = document.getElementById("res-title");
const resDesc = document.getElementById("res-desc");
const resLink = document.getElementById("res-link");
const resTag = document.getElementById("res-tag");
const resBtn = document.getElementById("res-btn");
const resSearch = document.getElementById("res-search");

let allResources = [];
let currentProfile = null;

function renderResources(items) {
  resourcesList.innerHTML = "";
  if (!items || items.length === 0) {
    resourcesList.innerHTML =
      '<div class="empty-state">No resources yet. Share notes, playlists, sheets, or repos that helped you.</div>';
    return;
  }
  items.forEach((r) => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
        <header class="card-header">
          <div class="user-chip">
            <div class="avatar">${(r.uploader_name || r.uploader_email || "C")
              .charAt(0)
              .toUpperCase()}</div>
            <div class="user-meta">
              <span class="user-meta-name">${r.title}</span>
              <span class="user-meta-sub">
                ${r.uploader_name || r.uploader_email}${
      r.department ? " · " + r.department : ""
    }
              </span>
            </div>
          </div>
          ${
            r.tag
              ? `<span class="card-chip">#${r.tag}</span>`
              : ""
          }
        </header>
        <div class="card-body">
          ${r.description || ""}
        </div>
        <footer class="card-footer">
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <a class="pill-button" href="${r.link}" target="_blank" rel="noopener">
              <span>↗</span>
              <span>Open resource</span>
            </a>
            <button class="pill-button" data-upvote style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.5);">
              <span>👍</span>
              <span>${r.upvotes_count || 0}</span>
            </button>
            ${
              r.uploader_id === currentProfile?.user_id
                ? `<button class="pill-button" data-delete style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5);">
                     <span>✕</span><span>Delete</span>
                   </button>`
                : ""
            }
          </div>
          <span class="muted">${new Date(r.created_at).toLocaleDateString()}</span>
        </footer>
      `;
    
    // Add event listeners
    const upvoteBtn = el.querySelector("[data-upvote]");
    const deleteBtn = el.querySelector("[data-delete]");
    
    upvoteBtn?.addEventListener("click", async () => {
      const { error } = await supabase
        .from("resources")
        .update({ upvotes_count: (r.upvotes_count || 0) + 1 })
        .eq("id", r.id);
      if (error) {
        console.error(error);
        return;
      }
      refresh();
    });
    
    deleteBtn?.addEventListener("click", async () => {
      if (!confirm("Delete this resource?")) return;
      const { error } = await supabase.from("resources").delete().eq("id", r.id);
      if (error) console.error(error);
      else refresh();
    });
    
    resourcesList.appendChild(el);
  });
}

async function initResources() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  currentProfile = profile 
    ? { ...profile, user_id: user.id, email: user.email }
    : { user_id: user.id, email: user.email };

  async function refresh() {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    allResources = data || [];
    renderResources(allResources);
  }

  resBtn?.addEventListener("click", async () => {
    if (!resTitle.value.trim() || !resLink.value.trim()) {
      alert("Title and Link are required.");
      return;
    }
    const { error } = await supabase.from("resources").insert({
      title: resTitle.value.trim(),
      description: resDesc.value.trim(),
      link: resLink.value.trim(),
      tag: resTag.value.trim() || null,
      uploader_id: user.id,
      uploader_email: user.email,
      uploader_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
    });
    if (error) {
      console.error(error);
      alert("Could not save resource.");
      return;
    }
    resTitle.value = "";
    resDesc.value = "";
    resLink.value = "";
    resTag.value = "";
    refresh();
  });

  resSearch?.addEventListener("input", () => {
    const q = resSearch.value.trim().toLowerCase();
    if (!q) {
      renderResources(allResources);
      return;
    }
    const filtered = allResources.filter((r) => {
      const haystack = [
        r.title,
        r.description,
        r.tag,
        r.department,
        r.uploader_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    renderResources(filtered);
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  if (resourcesList) initResources();
});

