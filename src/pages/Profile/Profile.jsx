import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import "./Profile.css";

export default function Profile() {
  const userId = auth.currentUser.uid;

  const [profile, setProfile] = useState({
    name: "",
    department: "",
    year: "",
    email: auth.currentUser.email,
  });

  const [editing, setEditing] = useState(false);

  const [posts, setPosts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [events, setEvents] = useState([]);

  // Fetch profile info
  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };
    fetchProfile();
  }, [userId]);

  // Fetch user activity
  useEffect(() => {
    const fetchActivity = async () => {
      // Posts
      const postSnap = await getDocs(
        query(collection(db, "posts"), where("user", "==", auth.currentUser.email), orderBy("created", "desc"))
      );
      setPosts(postSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Questions
      const qSnap = await getDocs(
        query(collection(db, "questions"), where("user", "==", auth.currentUser.email), orderBy("created", "desc"))
      );
      setQuestions(qSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Events
      const eSnap = await getDocs(
        query(collection(db, "events"), where("postedBy", "==", auth.currentUser.email), orderBy("created", "desc"))
      );
      setEvents(eSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchActivity();
  }, []);

  const handleSave = async () => {
    const docRef = doc(db, "users", userId);
    await setDoc(docRef, profile, { merge: true });
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <h2>👤 Your Profile</h2>

      {/* Profile Box */}
      <div className="profile-box glass">
        <div className="avatar">
          <span role="img" aria-label="avatar">🧑‍🎓</span>
        </div>

        {editing ? (
          <div className="edit-form">
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your Name"
            />
            <input
              type="text"
              value={profile.department}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })}
              placeholder="Department"
            />
            <input
              type="text"
              value={profile.year}
              onChange={(e) => setProfile({ ...profile, year: e.target.value })}
              placeholder="Year"
            />
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <h3>{profile.name || "Your Name"}</h3>
            <p><b>Email:</b> {profile.email}</p>
            <p><b>Department:</b> {profile.department || "CSE"}</p>
            <p><b>Year:</b> {profile.year || "1st Year"}</p>
            <button className="edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
          </>
        )}

        {/* Activity Stats */}
        <div className="activity-stats">
          <div><b>Posts:</b> {posts.length}</div>
          <div><b>Questions:</b> {questions.length}</div>
          <div><b>Events Posted:</b> {events.length}</div>
        </div>
      </div>

      {/* User Activity Lists */}
      <div className="activity-lists">
        {posts.length > 0 && (
          <div className="activity-section">
            <h3>📝 Your Posts</h3>
            {posts.map((p) => (
              <div key={p.id} className="activity-card">
                <p>{p.text}</p>
                <span>{new Date(p.created.seconds * 1000).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div className="activity-section">
            <h3>❓ Your Questions</h3>
            {questions.map((q) => (
              <div key={q.id} className="activity-card">
                <p>{q.text}</p>
                <span>{new Date(q.created.seconds * 1000).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div className="activity-section">
            <h3>📅 Your Events</h3>
            {events.map((e) => (
              <div key={e.id} className="activity-card">
                <p><b>{e.title}</b> - {e.description}</p>
                <span>{new Date(e.created.seconds * 1000).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}