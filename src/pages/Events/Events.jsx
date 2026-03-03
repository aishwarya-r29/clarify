import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import "./Events.css";

export default function Events() {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [flyer, setFlyer] = useState("");
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");

  // Post a new event
  const postEvent = async () => {
    if (!title || !department || !description) return;
    await addDoc(collection(db, "events"), {
      title,
      department,
      tags: tags.split(",").map((t) => t.trim()),
      description,
      flyer,
      created: Timestamp.now(),
      postedBy: auth.currentUser.email,
    });
    setTitle("");
    setDepartment("");
    setTags("");
    setDescription("");
    setFlyer("");
  };

  // Fetch events in real-time
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("created", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Filter events by search query
  const filteredEvents = events.filter((e) => {
    const queryLower = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(queryLower) ||
      e.department.toLowerCase().includes(queryLower) ||
      e.tags.some((tag) => tag.toLowerCase().includes(queryLower))
    );
  });

  return (
    <div className="events-page">
      <h2>📅 Campus Events</h2>

      {/* Post Event Form */}
      <div className="event-post-box glass">
        <input
          type="text"
          placeholder="Event Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Department (e.g., CSE, EEE)"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <textarea
          placeholder="Event Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="text"
          placeholder="Flyer URL (optional)"
          value={flyer}
          onChange={(e) => setFlyer(e.target.value)}
        />
        <button onClick={postEvent}>Post Event</button>
      </div>

      {/* Search */}
      <input
        className="event-search"
        type="text"
        placeholder="Search by title, department, or tag..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Event List */}
      <div className="events-list">
        {filteredEvents.map((e) => (
          <div key={e.id} className="event-card glass">
            <h3>{e.title}</h3>
            <p><b>Department:</b> {e.department}</p>
            <p><b>Tags:</b> {e.tags.join(", ")}</p>
            <p>{e.description}</p>
            {e.flyer && (
              <a href={e.flyer} target="_blank" rel="noreferrer">
                View Flyer
              </a>
            )}
            <p className="posted-by">Posted by: {e.postedBy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}