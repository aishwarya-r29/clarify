import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const eventsList = document.getElementById("events-list");
const evName = document.getElementById("ev-name");
const evDate = document.getElementById("ev-date");
const evDesc = document.getElementById("ev-desc");
const evLink = document.getElementById("ev-link");
const evBtn = document.getElementById("ev-btn");
const evSearch = document.getElementById("ev-search");

let allEvents = [];
let currentProfile = null;

function renderEvents(items) {
  eventsList.innerHTML = "";
  if (!items || items.length === 0) {
    eventsList.innerHTML =
      '<div class="empty-state">No events yet. Share upcoming hackathons, workshops, or club activities.</div>';
    return;
  }
  items.forEach((e) => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
        <header class="card-header">
          <div class="user-chip">
            <div class="avatar">${(e.organizer_name || e.organizer_email || "E")
              .charAt(0)
              .toUpperCase()}</div>
            <div class="user-meta">
              <span class="user-meta-name">${e.name}</span>
              <span class="user-meta-sub">
                ${e.organizer_name || e.organizer_email}${
      e.department ? " · " + e.department : ""
    } · ${e.event_date ? new Date(e.event_date).toLocaleString() : ""}
              </span>
            </div>
          </div>
          <span class="card-chip">${e.department || "Event"}</span>
        </header>
        <div class="card-body">
          ${e.description || ""}
        </div>
        <footer class="card-footer">
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            ${
              e.register_link
                ? `<a class="pill-button" href="${e.register_link}" target="_blank" rel="noopener">
                      <span>📝</span>
                      <span>Register</span>
                   </a>`
                : "<span class='muted'>No registration link</span>"
            }
            <button class="pill-button" data-upvote style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.5);">
              <span>👍</span>
              <span>${e.upvotes_count || 0}</span>
            </button>
            ${
              e.organizer_id === currentProfile?.user_id
                ? `<button class="pill-button" data-delete style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5);">
                     <span>✕</span><span>Delete</span>
                   </button>`
                : ""
            }
          </div>
          <span class="muted">${
            e.location ? e.location : "PSG Tech · Campus event"
          }</span>
        </footer>
      `;
    
    // Add event listeners
    const upvoteBtn = el.querySelector("[data-upvote]");
    const deleteBtn = el.querySelector("[data-delete]");
    
    upvoteBtn?.addEventListener("click", async () => {
      const { error } = await supabase
        .from("events")
        .update({ upvotes_count: (e.upvotes_count || 0) + 1 })
        .eq("id", e.id);
      if (error) {
        console.error(error);
        return;
      }
      refresh();
    });
    
    deleteBtn?.addEventListener("click", async () => {
      if (!confirm("Delete this event?")) return;
      const { error } = await supabase.from("events").delete().eq("id", e.id);
      if (error) console.error(error);
      else refresh();
    });
    
    eventsList.appendChild(el);
  });
}

async function initEvents() {
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
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    allEvents = data || [];
    renderEvents(allEvents);
  }

  evBtn?.addEventListener("click", async () => {
    if (!evName.value.trim() || !evDate.value.trim()) {
      alert("Event name and date/time are required.");
      return;
    }
    const { error } = await supabase.from("events").insert({
      name: evName.value.trim(),
      description: evDesc.value.trim(),
      event_date: evDate.value,
      register_link: evLink.value.trim() || null,
      organizer_id: user.id,
      organizer_email: user.email,
      organizer_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
    });
    if (error) {
      console.error(error);
      alert("Could not create event.");
      return;
    }
    evName.value = "";
    evDate.value = "";
    evDesc.value = "";
    evLink.value = "";
    refresh();
  });

  evSearch?.addEventListener("input", () => {
    const q = evSearch.value.trim().toLowerCase();
    if (!q) {
      renderEvents(allEvents);
      return;
    }
    const filtered = allEvents.filter((e) => {
      const haystack = [e.name, e.description, e.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    renderEvents(filtered);
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  if (eventsList) initEvents();
});

