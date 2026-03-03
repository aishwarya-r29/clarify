import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="navbar glass">
      <div className="logo">
         <span>Clarify</span>
      </div>
      <div className="nav-links">
        <Link to="/home">Home</Link>
        <Link to="/ask">Ask</Link>
        <Link to="/resources">Resources</Link>
        <Link to="/events">Events</Link>
        <Link to="/profile">Profile</Link>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}