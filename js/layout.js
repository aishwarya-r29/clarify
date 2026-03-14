import { supabase } from "./supabaseClient.js";

// Navbar active state and mobile toggle
const currentPath = window.location.pathname;
const navLinks = document.querySelectorAll("[data-nav-link]");
const navToggle = document.getElementById("nav-toggle");
const navLinksContainer = document.getElementById("nav-links");

navLinks.forEach((link) => {
  const target = link.getAttribute("href");
  if (target && currentPath.endsWith(target.replace("/pages", ""))) return;
  if (target && currentPath.endsWith(target)) {
    link.classList.add("active");
  }
});

navToggle?.addEventListener("click", () => {
  navLinksContainer?.classList.toggle("open");
});

// Logout handling
const logoutBtn = document.getElementById("logout-btn");
logoutBtn?.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  window.location.href = "/pages/login.html";
});

