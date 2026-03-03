import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  // Only allow PSG Tech email
  const validateCollegeMail = () => email.endsWith("@psgtech.ac.in");

  // Login existing user
  const handleLogin = async () => {
    if (!validateCollegeMail()) return setMsg("⚠️ Use PSG Tech email only");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setMsg("✅ Logged in!");
    } catch (e) {
      setMsg("User not found or wrong password. Try registering.");
    }
  };

  // Register new user
  const handleRegister = async () => {
    if (!validateCollegeMail()) return setMsg("⚠️ Use PSG Tech email only");
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      setMsg("✅ Account created! Logged in.");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box glass">
        <h1>Clarify</h1>
        <p>PSG Tech Student Network</p>
        <input
          type="email"
          placeholder="rollno@psgtech.ac.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleRegister}>Register</button>
        <p className="msg">{msg}</p>
      </div>
    </div>
  );
}