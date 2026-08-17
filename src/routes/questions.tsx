import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { fetchMe, fetchQuestions } from "../lib/api";
import type { MeResponse, Question } from "../lib/api";
import { PageHeaderToggle } from "../components/PageHeaderToggle";
import { QuestionComposer } from "../components/QuestionComposer";
import { QuestionCard } from "../components/QuestionCard";
import { usePushRefresh } from "../components/PushListener";
import { PageLoader } from "../components/PageLoader";
import { parseQuestionsTab } from "../lib/questions-nav";
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

  function openAskMode() {
    navigate({ to: "/questions", search: { tab: "ask" } });
  }

  function closeAskMode() {
    navigate({ to: "/questions", search: { tab: "answers" } });
  }

  async function handleQuestionSent() {
    await loadQuestions();
    closeAskMode();
  }

  if (!me) {
    return (
      <div className="page questions-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  const asking = tab === "ask";

  return (
    <div className="page questions-page">
      <div className="page-header">
        <h1>Questions</h1>
        <PageHeaderToggle
          mode={asking ? "close" : "add"}
          addLabel="Ask a question"
          closeLabel="Close ask question"
          onClick={() => (asking ? closeAskMode() : openAskMode())}
        />
      </div>

      {asking ? (
        <QuestionComposer
          partnerName={me.partnerName}
          onSent={() => handleQuestionSent().catch(console.error)}
        />
      ) : loading ? (
        <p className="hint">Loading…</p>
      ) : questions.length === 0 ? (
        <p className="hint">
          No questions yet. Tap <strong>+</strong> to send the first one!
        </p>
      ) : (
        <section className="thread" aria-label="Answers">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              currentPartnerId={me.partnerId}
              partnerName={me.partnerName}
            />
          ))}
        </section>
      )}
    </div>
  );
}
