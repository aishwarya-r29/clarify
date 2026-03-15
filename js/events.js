import { supabase, requireAuth, ensureVerified } from "./supabaseClient.js";

const evName = document.getElementById("ev-name");
const evDesc = document.getElementById("ev-desc");
const evDate = document.getElementById("ev-date");
const evRegister = document.getElementById("ev-link");
const evLocation = document.getElementById("event-location");
const evTag = document.getElementById("event-tag");
const evBtn = document.getElementById("ev-btn");
const evSearch = document.getElementById("ev-search");
const eventsList = document.getElementById("events-list");

let allEvents = [];
let currentProfile = null;

function formatEventTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = date.toLocaleDateString('en-US', options);
  return `${dateStr} at ${displayHours}:${displayMinutes} ${ampm}`;
}

function renderEvents(items) {
  eventsList.innerHTML = "";
  if (!items?.length) {
    eventsList.innerHTML = '<div class="empty-state">No events yet. Share upcoming hackathons, workshops, or club activities.</div>';
    return;
  }

  items.forEach(e => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <header class="card-header">
        <div class="user-chip">
          <div class="avatar">${(e.organizer_name || e.organizer_email || "E").charAt(0).toUpperCase()}</div>
          <div class="user-meta">
            <span class="user-meta-name">${e.name}</span>
            <span class="user-meta-sub">${e.organizer_name || e.organizer_email}${e.department ? " · " + e.department : ""}</span>
          </div>
        </div>
        <span class="card-chip">${e.department || "Event"}</span>
      </header>
      <div class="card-body">
        <div class="event-datetime" style="margin-bottom:0.75rem;padding:0.5rem;background:rgba(59,130,246,0.1);border-radius:0.5rem;border-left:3px solid rgba(59,130,246,0.5);">
          <div style="font-weight:600;color:#60a5fa;margin-bottom:0.25rem;">📅 Event Date & Time</div>
          <div style="font-size:0.9rem;color:#e5e7eb;">${formatEventTime(e.event_date)}</div>
        </div>
        <div style="margin-bottom:0.5rem;font-weight:600;color:#f9fafb;">📝 Event Description</div>
        <div style="color:#d1d5db;line-height:1.5;">${e.description || "No description provided."}</div>
      </div>
      <footer class="card-footer">
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          ${e.register_link ? `<a class="pill-button" href="${e.register_link}" target="_blank">📝 Register</a>` : "<span class='muted'>No registration link</span>"}
          <button class="pill-button" data-upvote>👍 <span>${e.event_upvotes?.length || 0}</span></button>
          ${e.organizer_id === currentProfile?.user_id ? `<button class="pill-button" data-delete style="background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5);">✕ Delete</button>` : ""}
        </div>
        <span class="muted" style="margin-top:0.5rem;">${e.location ? `📍 ${e.location}` : "📍 PSG Tech · Campus event"}</span>
      </footer>
    `;

    const upvoteBtn = el.querySelector("[data-upvote]");
    const deleteBtn = el.querySelector("[data-delete]");

    upvoteBtn?.addEventListener("click", async () => {
      const { data: userUpvote } = await supabase.from("event_upvotes").select("*").eq("event_id", e.id).eq("user_id", currentProfile?.user_id).maybeSingle();
      if (userUpvote) await supabase.from("event_upvotes").delete().eq("id", userUpvote.id);
      else await supabase.from("event_upvotes").insert({ event_id: e.id, user_id: currentProfile?.user_id });
      const { data: upvotesData } = await supabase.from("event_upvotes").select("*").eq("event_id", e.id);
      upvoteBtn.querySelector('span:last-child').textContent = upvotesData?.length || 0;
      e.upvotes_count = upvotesData?.length || 0;
      e.event_upvotes = upvotesData || [];
    });

    deleteBtn?.addEventListener("click", async () => {
      if (!confirm("Delete this event?")) return;
      const { error } = await supabase.from("events").delete().eq("id", e.id);
      if (!error) el.remove();
    });

    eventsList.appendChild(el);
  });
}

async function initEvents() {
  const session = await requireAuth();
  if (!session) return;
  if (!ensureVerified(session)) return;

  const user = session.user;
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  currentProfile = profile ? { ...profile, user_id: user.id, email: user.email } : { user_id: user.id, email: user.email };

  async function refresh() {
    const { data, error } = await supabase.from("events").select("*").order("event_date",{ascending:true});
    if (!error) allEvents = data || [];
    renderEvents(allEvents);
  }

  evBtn?.addEventListener("click", async () => {
    if (!evName.value.trim() || !evDate.value.trim()) return alert("Event name and date/time are required.");
    const formattedDate = new Date(evDate.value).toISOString();
    const { error } = await supabase.from("events").insert({
      name: evName.value.trim(),
      description: evDesc.value.trim(),
      event_date: formattedDate,
      register_link: evRegister.value.trim() || null,
      organizer_id: user.id,
      organizer_email: user.email,
      organizer_name: currentProfile?.full_name || null,
      department: currentProfile?.department || null,
      location: evLocation?.value?.trim() || null,
      tag: evTag?.value?.trim() || null
    });
    if (error) return alert("Could not create event. Error: " + error.message);
    evName.value=""; evDate.value=""; evDesc.value=""; evRegister.value=""; if(evLocation) evLocation.value=""; if(evTag) evTag.value="";
    alert("Event created successfully!");
    refresh();
  });

  evSearch?.addEventListener("input", () => {
    const q = evSearch.value.trim().toLowerCase();
    if (!q) return renderEvents(allEvents);
    const filtered = allEvents.filter(e => [e.name,e.description,e.department].filter(Boolean).join(" ").toLowerCase().includes(q));
    renderEvents(filtered);
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", () => { if(eventsList) initEvents(); });