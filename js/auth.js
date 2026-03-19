import { supabase } from "./supabaseClient.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const toggleLoginBtn = document.getElementById("toggle-login");
const toggleSignupBtn = document.getElementById("toggle-signup");
const submitBtn = document.getElementById("submit-btn");
const modeLabel = document.getElementById("mode-label");
const subLabel = document.getElementById("sub-label");
const alertBox = document.getElementById("alert-box");
const form = document.getElementById("auth-form");

let mode = "login";
let isSubmitting = false; // 🔥 CRITICAL FIX

// ---------------- ALERT ----------------
function showAlert(message, type = "error") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert ${
    type === "error" ? "alert-error" : "alert-success"
  }`;
}

function clearAlert() {
  if (!alertBox) return;
  alertBox.textContent = "";
  alertBox.className = "alert";
}

// ---------------- VALIDATION ----------------
function validatePsgEmail(email) {
  return email.trim().toLowerCase().endsWith("@psgtech.ac.in");
}

// ---------------- MODE SWITCH ----------------
function setMode(nextMode) {
  mode = nextMode;
  clearAlert();

  if (nextMode === "login") {
    toggleLoginBtn.classList.add("active");
    toggleSignupBtn.classList.remove("active");

    modeLabel.textContent = "Welcome back";
    subLabel.textContent =
      "Sign in with your PSG Tech email to access Clarify.";
    submitBtn.textContent = "Login";
  } else {
    toggleSignupBtn.classList.add("active");
    toggleLoginBtn.classList.remove("active");

    modeLabel.textContent = "Create your Clarify account";
    subLabel.textContent =
      "Use your college email (rollno@psgtech.ac.in). A verification link will be sent.";
    submitBtn.textContent = "Create account";
  }
}

// Toggle buttons
toggleLoginBtn?.addEventListener("click", () => setMode("login"));
toggleSignupBtn?.addEventListener("click", () => setMode("signup"));

// ---------------- MAIN AUTH ----------------
async function handleSubmit(e) {
  e.preventDefault();

  // 🔥 PREVENT MULTIPLE CALLS (fixes 429)
  if (isSubmitting) return;
  isSubmitting = true;

  clearAlert();

  if (!supabase) {
    showAlert("Supabase not configured properly.");
    isSubmitting = false;
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validation
  if (!validatePsgEmail(email)) {
    showAlert("Use your official PSG Tech email (rollno@psgtech.ac.in).");
    isSubmitting = false;
    return;
  }

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters.");
    isSubmitting = false;
    return;
  }

  // UI loading
  submitBtn.disabled = true;
  submitBtn.textContent =
    mode === "login" ? "Logging in..." : "Creating account...";

  try {
    // ---------------- SIGNUP ----------------
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      showAlert(
        "✅ Account created! Check your email to verify before logging in.",
        "success"
      );

      setMode("login");
    }

    // ---------------- LOGIN ----------------
    else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data?.user;

      // Check email verification
      const emailConfirmed =
        user?.email_confirmed_at ||
        user?.confirmed_at ||
        user?.confirmed;

      if (!emailConfirmed) {
        showAlert("⚠️ Please verify your email before logging in.");
        await supabase.auth.signOut();
        return;
      }

      // Check profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        window.location.href = "./profile-setup.html";
      } else {
        window.location.href = "./home.html";
      }
    }
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Something went wrong.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent =
      mode === "login" ? "Login" : "Create account";

    // 🔥 RELEASE LOCK
    isSubmitting = false;
  }
}

// Attach ONLY once
form?.addEventListener("submit", handleSubmit);
