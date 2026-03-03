import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./Resources.css";

export default function Resources() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");

  const storage = getStorage();

  // Post resource
  const postResource = async () => {
    if (!title || !subject) return;

    let fileURL = link; // Use link if provided
    if (file) {
      const fileRef = ref(storage, `resources/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      fileURL = await getDownloadURL(fileRef);
    }

    await addDoc(collection(db, "resources"), {
      title,
      subject,
      link: fileURL || "",
      postedBy: auth.currentUser.email,
      created: Timestamp.now(),
    });

    setTitle("");
    setSubject("");
    setLink("");
    setFile(null);
  };

  // Fetch resources
  useEffect(() => {
    const q = query(collection(db, "resources"), orderBy("created", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Filter by search
  const filtered = resources.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q)
    );
  });

  return (
    <div className="resources-page">
      <h2>📚 Resources Hub</h2>

      {/* Upload Resource Form */}
      <div className="resource-upload-box glass">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Subject (e.g., DS, DBMS)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          type="text"
          placeholder="External Link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <input
          type="file"
          accept=".pdf,.docx,.pptx"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button onClick={postResource}>Add Resource</button>
      </div>

      {/* Search */}
      <input
        className="resource-search"
        type="text"
        placeholder="Search by title or subject..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Resource List */}
      <div className="resource-list">
        {filtered.map((r) => (
          <div key={r.id} className="resource-card glass">
            <h3>{r.title}</h3>
            <p><b>Subject:</b> {r.subject}</p>
            <p><b>Posted by:</b> {r.postedBy}</p>
            {r.link && (
              <a href={r.link} target="_blank" rel="noreferrer">
                Access Resource
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}