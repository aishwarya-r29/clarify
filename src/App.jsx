import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "./firebase";

import Navbar from "./components/NavBar/NavBar";
import Footer from "./components/Footer/Footer";

import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import Ask from "./pages/Ask/Ask";
import Resources from "./pages/Resources/Resources";
import Events from "./pages/Events/Events";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    // Show loading screen while checking auth
    return <div style={{ color: "white", textAlign: "center", marginTop: "50px" }}>Loading...</div>;
  }

  return (
    <Router>
      {user && <Navbar />} {/* Navbar only visible if logged in */}
      <Routes>
        {/* Public route */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/home" />}
        />

        {/* Protected routes */}
        <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/ask" element={user ? <Ask /> : <Navigate to="/login" />} />
        <Route path="/resources" element={user ? <Resources /> : <Navigate to="/login" />} />
        <Route path="/events" element={user ? <Events /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
      {user && <Footer />}
    </Router>
  );
}

export default App;