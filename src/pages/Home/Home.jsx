import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import "./Home.css";

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [post, setPost] = useState("");
  const [replyText, setReplyText] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFeed(data);
    });
    return () => unsub();
  }, []);

  if (!user || !profile) return <div className="page center">Loading...</div>;

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  const sendPost = async () => {
    if (!post.trim()) return;
    await addDoc(collection(db, "posts"), {
      text: post,
      created: Date.now(),
      userUid: user.uid,
      userEmail: user.email,
      name: profile.name,
      department: profile.department,
      year: profile.year,
      replies: [],
      upvotes: [],
      tags: post.toLowerCase(),
    });
    setPost("");
  };

  const deletePost = async (postId) => {
    await deleteDoc(doc(db, "posts", postId));
  };

  // ✅ UPDATED REPLY FUNCTION
  const sendReply = async (postId) => {
    const text = replyText[postId];
    if (!text?.trim()) return;

    const ref = doc(db, "posts", postId);

    await updateDoc(ref, {
      replies: [
        ...(feed.find((p) => p.id === postId)?.replies || []),
        {
          text,
          userUid: user.uid,
          userEmail: user.email,
          created: Date.now(),
          name: profile.name,
          department: profile.department,
          year: profile.year,
        },
      ],
    });

    setReplyText((prev) => ({ ...prev, [postId]: "" }));
  };

  const deleteReply = async (postId, index) => {
    const postData = feed.find((p) => p.id === postId);
    if (!postData) return;

    const updated = (postData.replies || []).filter((_, i) => i !== index);

    await updateDoc(doc(db, "posts", postId), {
      replies: updated,
    });
  };

  const filteredFeed = feed.filter((p) =>
    (p.tags || "").includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h2>Community Feed</h2>

      <input
        className="search"
        placeholder="Search by tags, dept, subject, words..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="composer">
        <textarea
          placeholder="Share something with your community..."
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />
        <button onClick={sendPost}>Post</button>
      </div>

      {filteredFeed.map((p) => {
        const isOwner = p.userUid === user.uid;
        const replies = p.replies || [];

        return (
          <div key={p.id} className="post-card">
            <div className="post-header">
              <div>
                <div className="user">
                  {p.name} • {p.department} • {p.year}
                </div>
                <div className="meta">{timeAgo(p.created)}</div>
              </div>

              {isOwner && (
                <button className="delete" onClick={() => deletePost(p.id)}>
                  Delete
                </button>
              )}
            </div>

            <div className="post-content">{p.text}</div>

            <div className="reply-count">{replies.length} Replies</div>

            <div className="replies">
              {replies.map((r, i) => {
                const canDelete = r.userUid === user.uid;

                return (
                  <div key={i} className="reply">
                    <div className="reply-content">
                      <div className="reply-user">
                        {r.name} • {r.department} • {r.year}
                      </div>
                      <div className="reply-text">{r.text}</div>
                    </div>

                    {canDelete && (
                      <span
                        className="reply-delete"
                        onClick={() => deleteReply(p.id, i)}
                      >
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="reply-box">
                <input
                  placeholder="Write a reply..."
                  value={replyText[p.id] || ""}
                  onChange={(e) =>
                    setReplyText((prev) => ({
                      ...prev,
                      [p.id]: e.target.value,
                    }))
                  }
                />
                <button onClick={() => sendReply(p.id)}>Reply</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}