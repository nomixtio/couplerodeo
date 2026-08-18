import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function NotesAddButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  function createNote(type: "simple" | "todo") {
    setOpen(false);
    navigate({
      to: "/notes/$noteId",
      params: { noteId: "new" },
      search: { type, planId: undefined },
    });
  }

  return (
    <div className="notes-add-menu" ref={menuRef}>
      <button
        type="button"
        className="btn ghost page-header-toggle-btn"
        aria-label="Create note or list"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        +
      </button>

      {open && (
        <div className="notes-add-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => createNote("simple")}
          >
            Create a Note
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => createNote("todo")}
          >
            Create a List
          </button>
        </div>
      )}
    </div>
  );
}
