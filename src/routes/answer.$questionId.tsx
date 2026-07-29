import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMe, fetchQuestion, submitAnswer } from "../lib/api";
import type { Question } from "../lib/api";
import { AnswerForm } from "../components/AnswerInputs";
import { hasSession, partnerDisplayName, partnerLabel } from "../lib/partner";

export const Route = createFileRoute("/answer/$questionId")({
  component: AnswerPage,
});

function AnswerPage() {
  const { questionId } = Route.useParams();
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchQuestion(questionId)])
      .then(([me, data]) => {
        setPartnerId(me.partnerId);
        setPartnerName(me.partnerName);
        setQuestion(data.question);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        if (err instanceof Error && err.message.includes("401")) {
          navigate({ to: "/connect" });
        }
      })
      .finally(() => setLoading(false));
  }, [questionId, navigate]);

  async function handleSubmit(value: string) {
    await submitAnswer(questionId, value);
    navigate({ to: "/questions", search: { tab: "answers" } });
  }

  if (loading) return <p className="hint">Loading…</p>;
  if (error) return <p className="hint error">{error}</p>;
  if (!question || !partnerId) return <p className="hint error">Question not found.</p>;

  if (question.answer) {
    return (
      <div className="page answer-page">
        <p className="hint">Already answered.</p>
        <Link to="/questions" className="btn primary">
          Back to questions
        </Link>
      </div>
    );
  }

  if (question.from_partner_id === partnerId) {
    return (
      <div className="page answer-page">
        <p className="hint">
          This is your question — wait for {partnerDisplayName(partnerName)} to answer.
        </p>
        <Link to="/questions" className="btn primary">
          Back to questions
        </Link>
      </div>
    );
  }

  return (
    <div className="page answer-page">
      <article className="card">
        <span className="badge">{question.type}</span>
        <p className="question-text">{question.text}</p>
        <p className="meta">
          From {partnerLabel(question.from_partner_id, partnerId, question.from_label)}
        </p>
      </article>

      <AnswerForm question={question} onSubmit={handleSubmit} />
    </div>
  );
}
