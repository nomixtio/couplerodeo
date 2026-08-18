import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { NotesAddButton } from "../components/NotesAddButton";
import { PageFilter } from "../components/PageFilter";
import { SimpleNoteCard } from "../components/SimpleNoteCard";
import { TodoNoteCard } from "../components/TodoNoteCard";
import { PageLoader } from "../components/PageLoader";
import { usePushRefresh } from "../components/PushListener";
import { fetchMe, fetchNotes, type MeResponse, type Note } from "../lib/api";
import { hasSession } from "../lib/partner";
import {
  NOTES_FILTER_LABELS,
  parseNotesFilter,
  type NotesFilter,
} from "../lib/notes-nav";

export const Route = createFileRoute("/notes/")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: parseNotesFilter(
      typeof search.filter === "string" ? search.filter : undefined,
    ),
  }),
  component: NotesPage,
});

const NOTES_FILTER_OPTIONS = (
  Object.keys(NOTES_FILTER_LABELS) as NotesFilter[]
).map((value) => ({ value, label: NOTES_FILTER_LABELS[value] }));

function NotesPage() {
  const navigate = useNavigate();
  const { filter } = Route.useSearch();
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

  function selectFilter(next: NotesFilter) {
    navigate({ to: "/notes", search: { filter: next } });
  }

  const filteredNotes = notes.filter((note) => {
    const isDeleted = note.deleted_at != null;
    if (filter === "deleted") return isDeleted;
    if (isDeleted) return false;
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
        <div className="notes-header-actions">
          <PageFilter
            value={filter}
            options={NOTES_FILTER_OPTIONS}
            label="Filter notes"
            onChange={selectFilter}
          />
          <NotesAddButton />
        </div>
      </div>

      {loading ? (
        <p className="hint">Loading…</p>
      ) : filteredNotes.length === 0 ? (
        <p className="hint">
          {filter === "deleted" ? (
            "No deleted notes."
          ) : (
            <>
              No notes yet. Tap <strong>+</strong> to create a note or list.
            </>
          )}
        </p>
      ) : (
        <section className="thread notes-thread" aria-label="All notes">
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
                onDeleted={() => loadNotes().catch(console.error)}
              />
            ),
          )}
        </section>
      )}
    </div>
  );
}
