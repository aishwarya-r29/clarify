import { supabase } from "./supabaseClient.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const toggleLoginBtn = document.getElementById("toggle-login");
const toggleSignupBtn = document.getElementById("toggle-signup");
const submitBtn = document.getElementById("submit-btn");
const modeLabel = document.getElementById("mode-label");
const subLabel = document.getElementById("sub-label");
const alertBox = document.getElementById("alert-box");

let mode = "login";

function showAlert(message, type = "error") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert ${type === "error" ? "alert-error" : "alert-success"}`;
}

function clearAlert() {
  if (!alertBox) return;
  alertBox.textContent = "";
  alertBox.className = "alert";
}

function validatePsgEmail(email) {
  return email.trim().toLowerCase().endsWith("@psgtech.ac.in");
}

function setMode(nextMode) {
  mode = nextMode;
  clearAlert();
  if (nextMode === "login") {
    toggleLoginBtn.classList.add("active");
    toggleSignupBtn.classList.remove("active");
    modeLabel.textContent = "Welcome back";
    subLabel.textContent = "Sign in with your PSG Tech email to access Clarify.";
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

toggleLoginBtn?.addEventListener("click", () => setMode("login"));
toggleSignupBtn?.addEventListener("click", () => setMode("signup"));

async function handleSubmit(e) {
  e.preventDefault();
  clearAlert();

  if (!supabase) {
    showAlert("Supabase client not available. Check configuration.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!validatePsgEmail(email)) {
    showAlert("Use your official PSG Tech email (rollno@psgtech.ac.in).");
    return;
  }

  if (password.length < 6) {
    showAlert("Password should be at least 6 characters.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = mode === "login" ? "Logging in..." : "Creating account...";

  try {
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp(
        {
          email,
          password,
          options: {
            emailRedirectTo: window.location.href,
          },
        }
      );
      if (error) throw error;
      showAlert(
        "Account created. Check your inbox and verify your email before logging in.",
        "success"
      );
      setMode("login");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const session = data.session;
      const user = session?.user;

      // Email verification check will be enforced on next pages as well
      // but we can block here too.
      const emailConfirmed =
        user?.email_confirmed_at || user?.confirmed_at || user?.confirmed;
      if (!emailConfirmed) {
        showAlert(
          "Please verify your email from the verification mail before logging in."
        );
        await supabase.auth.signOut();
        return;
      }

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
      }

      if (!profile) {
        window.location.href = "./profile-setup.html";
      } else {
        window.location.href = "./home.html";
      }
    }
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Something went wrong. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = mode === "login" ? "Login" : "Create account";
  }
}

document.getElementById("auth-form")?.addEventListener("submit", handleSubmit);

