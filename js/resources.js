import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const resourcesList = document.getElementById("resources-list");
const resTitle = document.getElementById("res-title");
const resDesc = document.getElementById("res-desc");
const resLink = document.getElementById("res-link");
const resTag = document.getElementById("res-tag");
const resBtn = document.getElementById("res-btn");

async function initResources() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;

  async function refresh() {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    resourcesList.innerHTML = "";
    if (!data || data.length === 0) {
      resourcesList.innerHTML =
        '<div class="empty-state">No resources yet. Share notes, playlists, sheets, or repos that helped you.</div>';
      return;
    }
    data.forEach((r) => {
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
                Uploaded by ${r.uploader_name || r.uploader_email}
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
          <a class="pill-button" href="${r.link}" target="_blank" rel="noopener">
            <span>↗</span>
            <span>Open resource</span>
          </a>
          <span class="muted">${new Date(r.created_at).toLocaleDateString()}</span>
        </footer>
      `;
      resourcesList.appendChild(el);
    });
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

  refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  if (resourcesList) initResources();
});

