import { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import "./Ask.css";

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState([]);

  // Post a new question
  const postQuestion = async () => {
    if (!question) return;
    await addDoc(collection(db, "questions"), {
      text: question,
      user: auth.currentUser.email,
      created: Timestamp.now(),
      upvotes: 0,
    });
    setQuestion("");
  };

  // Fetch questions in real-time
  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("created", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="ask-page">
      <h2>💡 Ask Doubts</h2>
      <div className="ask-box glass">
        <textarea
          placeholder="Type your question here..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button onClick={postQuestion}>Post Question</button>
      </div>

      <div className="questions-list">
        {questions.map((q) => (
          <div key={q.id} className="question-card glass">
            <b>{q.user}</b>
            <p>{q.text}</p>
            <span>Upvotes: {q.upvotes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}