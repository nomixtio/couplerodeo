import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { NoteComposer } from "../components/NoteComposer";
import { SimpleNoteCard } from "../components/SimpleNoteCard";
import { TodoNoteCard } from "../components/TodoNoteCard";
import { PageLoader } from "../components/PageLoader";
import { usePushRefresh } from "../components/PushListener";
import { fetchMe, fetchNotes, type MeResponse, type Note } from "../lib/api";
import { hasSession } from "../lib/partner";
import {
  parseNotesFilter,
  parseNotesTab,
  type NotesFilter,
  type NotesTab,
} from "../lib/notes-nav";

export const Route = createFileRoute("/notes")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseNotesTab(typeof search.tab === "string" ? search.tab : undefined),
    filter: parseNotesFilter(
      typeof search.filter === "string" ? search.filter : undefined,
    ),
  }),
  component: NotesPage,
});

function NotesPage() {
  const navigate = useNavigate();
  const { tab, filter } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    const data = await fetchNotes();
    setNotes(data.notes);
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchNotes()])
      .then(([meData, data]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
        setNotes(data.notes);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadNotes().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadNotes]);

  usePushRefresh(() => {
    loadNotes().catch(console.error);
  });

  function selectTab(next: NotesTab) {
    navigate({ to: "/notes", search: { tab: next, filter } });
  }

  function selectFilter(next: NotesFilter) {
    navigate({ to: "/notes", search: { tab, filter: next } });
  }

  async function handleNoteCreated() {
    await loadNotes();
    navigate({ to: "/notes", search: { tab: "all", filter } });
  }

  const filteredNotes = notes.filter((note) => {
    if (filter === "all") return true;
    return note.type === filter;
  });

  if (!me) {
    return (
      <div className="page notes-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  return (
    <div className="page notes-page">
      <div className="page-header">
        <h1>Notes</h1>
      </div>

      <div className="page-tabs" role="tablist" aria-label="Notes">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "new"}
          className={tab === "new" ? "active" : ""}
          onClick={() => selectTab("new")}
        >
          New
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={tab === "all" ? "active" : ""}
          onClick={() => selectTab("all")}
        >
          View
        </button>
      </div>

      {tab === "new" && (
        <section role="tabpanel" aria-label="New">
          <NoteComposer onCreated={() => handleNoteCreated().catch(console.error)} />
        </section>
      )}

      {tab === "all" && (
        <section role="tabpanel" aria-label="View notes">
          <div
            className="notes-filter note-type-toggle note-type-toggle-three"
            role="tablist"
            aria-label="Filter notes"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              className={filter === "all" ? "active" : ""}
              onClick={() => selectFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "simple"}
              className={filter === "simple" ? "active" : ""}
              onClick={() => selectFilter("simple")}
            >
              Notes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "todo"}
              className={filter === "todo" ? "active" : ""}
              onClick={() => selectFilter("todo")}
            >
              Lists
            </button>
          </div>

          {loading ? (
            <p className="hint">Loading…</p>
          ) : filteredNotes.length === 0 ? (
            <p className="hint">
              No notes yet. Switch to New to add the first one!
            </p>
          ) : (
            <div className="thread notes-thread">
              {filteredNotes.map((note) =>
                note.type === "todo" ? (
                  <TodoNoteCard
                    key={note.id}
                    note={note}
                    currentPartnerId={me.partnerId}
                    partnerName={me.partnerName}
                    onUpdated={() => loadNotes().catch(console.error)}
                    onDeleted={() => loadNotes().catch(console.error)}
                  />
                ) : (
                  <SimpleNoteCard
                    key={note.id}
                    note={note}
                    currentPartnerId={me.partnerId}
                    onUpdated={() => loadNotes().catch(console.error)}
                    onDeleted={() => loadNotes().catch(console.error)}
                  />
                ),
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
