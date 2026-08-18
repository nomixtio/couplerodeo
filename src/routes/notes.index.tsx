import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotesAddButton } from "../components/NotesAddButton";
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

function FilterIcon() {
  return (
    <svg
      className="notes-filter-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function NotesPage() {
  const navigate = useNavigate();
  const { filter } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!filterOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFilterOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [filterOpen]);

  function selectFilter(next: NotesFilter) {
    setFilterOpen(false);
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
          <div className="notes-filter-menu" ref={filterRef}>
            <button
              type="button"
              className={`btn ghost notes-filter-btn${filter !== "all" ? " active-filter" : ""}`}
              aria-label={`Filter notes (${NOTES_FILTER_LABELS[filter]})`}
              aria-expanded={filterOpen}
              aria-haspopup="menu"
              onClick={() => setFilterOpen((open) => !open)}
            >
              <FilterIcon />
            </button>
            {filterOpen && (
              <menu className="notes-filter-panel" aria-label="Filter notes">
                {(Object.keys(NOTES_FILTER_LABELS) as NotesFilter[]).map(
                  (value) => (
                    <li key={value}>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={filter === value}
                        className={filter === value ? "active" : ""}
                        onClick={() => selectFilter(value)}
                      >
                        {NOTES_FILTER_LABELS[value]}
                      </button>
                    </li>
                  ),
                )}
              </menu>
            )}
          </div>
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
