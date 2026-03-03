import { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import "./Ask.css";

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [profile, setProfile] = useState(null);

  // 🔹 Get user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetchProfile();
  }, []);

  // 🔹 Real-time questions
  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const timeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  // 🔹 Post Question
  const postQuestion = async () => {
    if (!question.trim()) return;

    await addDoc(collection(db, "questions"), {
      text: question,
      userUid: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      name: profile.name,
      department: profile.department,
      year: profile.year,
      created: Date.now(),
      upvotes: [],
      replies: [],
    });

    setQuestion("");
  };

  // 🔹 Delete Question
  const deleteQuestion = async (id) => {
    await deleteDoc(doc(db, "questions", id));
  };

  // 🔹 Toggle Upvote
  const toggleUpvote = async (qId, currentUpvotes) => {
    const ref = doc(db, "questions", qId);
    const uid = auth.currentUser.uid;

    if (currentUpvotes.includes(uid)) {
      await updateDoc(ref, {
        upvotes: arrayRemove(uid),
      });
    } else {
      await updateDoc(ref, {
        upvotes: arrayUnion(uid),
      });
    }
  };

  // 🔹 Send Reply
  const sendReply = async (qId) => {
    const text = replyText[qId];
    if (!text?.trim()) return;

    const ref = doc(db, "questions", qId);

    await updateDoc(ref, {
      replies: arrayUnion({
        text,
        userUid: auth.currentUser.uid,
        name: profile.name,
        department: profile.department,
        year: profile.year,
        created: Date.now(),
      }),
    });

    setReplyText((prev) => ({ ...prev, [qId]: "" }));
  };

  // 🔹 Delete Reply
  const deleteReply = async (qId, replyObj) => {
    const ref = doc(db, "questions", qId);
    await updateDoc(ref, {
      replies: arrayRemove(replyObj),
    });
  };

  return (
    <div className="ask-page">
      <h2>💡 Ask Doubts</h2>

      {/* Ask Box */}
      <div className="ask-box glass">
        <textarea
          placeholder="Type your question here..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button onClick={postQuestion}>Post Question</button>
      </div>

      {/* Questions List */}
      <div className="questions-list">
        {questions.map((q) => {
          const isOwner = q.userUid === auth.currentUser.uid;
          const replies = q.replies || [];
          const upvotes = q.upvotes || [];
          const hasUpvoted = upvotes.includes(auth.currentUser.uid);

          return (
            <div key={q.id} className="question-card glass">
              <div className="question-header">
                <div>
                  <b>
                    {q.name} • {q.department} • {q.year}
                  </b>
                  <div className="meta">{timeAgo(q.created)}</div>
                </div>

                {isOwner && (
                  <button
                    className="delete-btn"
                    onClick={() => deleteQuestion(q.id)}
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="question-text">{q.text}</p>

              {/* Upvote */}
              <div className="question-actions">
                <span
                  className={`upvote ${hasUpvoted ? "active" : ""}`}
                  onClick={() => toggleUpvote(q.id, upvotes)}
                >
                  👍 {upvotes.length}
                </span>
              </div>

              {/* Replies */}
              <div className="replies">
                <div className="reply-count">
                  {replies.length} Replies
                </div>

                {replies.map((r, i) => {
                  const canDelete = r.userUid === auth.currentUser.uid;

                  return (
                    <div key={i} className="reply">
                      <div>
                        <div className="reply-user">
                          {r.name} • {r.department} • {r.year}
                        </div>
                        <div className="reply-text">{r.text}</div>
                        <div className="meta">
                          {timeAgo(r.created)}
                        </div>
                      </div>

                      {canDelete && (
                        <span
                          className="reply-delete"
                          onClick={() => deleteReply(q.id, r)}
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Reply Box */}
                <div className="reply-box">
                  <input
                    placeholder="Write a reply..."
                    value={replyText[q.id] || ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                  />
                  <button onClick={() => sendReply(q.id)}>
                    Reply
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}