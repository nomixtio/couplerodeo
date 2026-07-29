import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { fetchMe, fetchQuestions } from "../lib/api";
import type { MeResponse, Question } from "../lib/api";
import { QuestionComposer } from "../components/QuestionComposer";
import { QuestionCard } from "../components/QuestionCard";
import { usePushRefresh } from "../components/PushListener";
import { parseQuestionsTab, type QuestionsTab } from "../lib/questions-nav";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/questions")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseQuestionsTab(typeof search.tab === "string" ? search.tab : undefined),
  }),
  component: QuestionsPage,
});

function QuestionsPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuestions = useCallback(async () => {
    const data = await fetchQuestions();
    setQuestions(data.questions);
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchQuestions()])
      .then(([meData, qs]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
        setQuestions(qs.questions);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadQuestions().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadQuestions]);

  usePushRefresh(() => {
    loadQuestions().catch(console.error);
  });

  function selectTab(next: QuestionsTab) {
    navigate({ to: "/questions", search: { tab: next } });
  }

  async function handleQuestionSent() {
    await loadQuestions();
    navigate({ to: "/questions", search: { tab: "answers" } });
  }

  if (!me) {
    return (
      <div className="page questions-page">
        <p className="hint">{loading ? "Loading…" : "Redirecting…"}</p>
      </div>
    );
  }

  return (
    <div className="page questions-page">
      <div className="page-header">
        <h1>Questions</h1>
      </div>

      <div className="page-tabs" role="tablist" aria-label="Questions">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "answers"}
          className={tab === "answers" ? "active" : ""}
          onClick={() => selectTab("answers")}
        >
          Answers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ask"}
          className={tab === "ask" ? "active" : ""}
          onClick={() => selectTab("ask")}
        >
          Ask a question
        </button>
      </div>

      {tab === "answers" && (
        <section className="thread" role="tabpanel" aria-label="Answers">
          {loading ? (
            <p className="hint">Loading…</p>
          ) : questions.length === 0 ? (
            <p className="hint">No questions yet. Switch to Ask a question to send the first one!</p>
          ) : (
            questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                currentPartnerId={me.partnerId}
                partnerName={me.partnerName}
              />
            ))
          )}
        </section>
      )}

      {tab === "ask" && (
        <section role="tabpanel" aria-label="Ask a question">
          <QuestionComposer
            partnerName={me.partnerName}
            onSent={() => handleQuestionSent().catch(console.error)}
          />
        </section>
      )}
    </div>
  );
}
