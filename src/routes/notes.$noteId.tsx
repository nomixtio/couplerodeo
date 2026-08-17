import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NoteEditor } from "../components/NoteEditor";
import { PageLoader } from "../components/PageLoader";
import { fetchMe, fetchNote, type Note } from "../lib/api";
import { parseNoteEditorType } from "../lib/notes-nav";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/notes/$noteId")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: parseNoteEditorType(
      typeof search.type === "string" ? search.type : undefined,
    ),
  }),
  component: NoteDetailPage,
});

function NoteDetailPage() {
  const { noteId } = Route.useParams();
  const { type: newNoteType } = Route.useSearch();
  const navigate = useNavigate();
  const isNew = noteId === "new";
  const [note, setNote] = useState<Note | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    if (isNew) {
      fetchMe()
        .then((me) => {
          if (!me.partnerConnected) {
            navigate({ to: "/pairing" });
            return;
          }
          setPartnerId(me.partnerId);
          setPartnerName(me.partnerName);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load");
        });
      return;
    }

    Promise.all([fetchMe(), fetchNote(noteId)])
      .then(([me, data]) => {
        if (!me.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setPartnerId(me.partnerId);
        setPartnerName(me.partnerName);
        setNote(data.note);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load note");
      })
      .finally(() => setLoading(false));
  }, [noteId, isNew, navigate]);

  if (loading) return <PageLoader />;
  if (error) return <p className="hint error">{error}</p>;
  if (!partnerId) return <p className="hint error">Note not found.</p>;
  if (!isNew && !note) return <p className="hint error">Note not found.</p>;

  const backTo = note?.plan_id
    ? { to: "/plans/$planId" as const, params: { planId: note.plan_id } }
    : { to: "/notes" as const, search: { filter: "all" as const } };

  const backLabel = note?.plan_id ? "Plan" : "Notes";
  const editorType = isNew ? newNoteType : (note?.type ?? "simple");

  return (
    <div className="page note-sheet-page">
      <NoteEditor
        note={note ?? undefined}
        initialType={editorType}
        currentPartnerId={partnerId}
        partnerName={partnerName}
        backLink={backTo}
        backLabel={backLabel}
        onSaved={(saved) => {
          if (isNew) {
            navigate({ to: "/notes/$noteId", params: { noteId: saved.id } });
          } else {
            setNote(saved);
          }
        }}
        onDeleted={() => {
          if (note?.plan_id) {
            navigate({
              to: "/plans/$planId",
              params: { planId: note.plan_id },
            });
          } else {
            navigate({ to: "/notes", search: { filter: "all" } });
          }
        }}
      />
    </div>
  );
}
