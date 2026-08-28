import { useEffect, useState } from "react";
import {
  UPDATE_MAX_LENGTH,
  canAddQuickUpdate,
  canAddQuickUpdateIcon,
  canClearQuickUpdateIcon,
  canRemoveQuickUpdate,
  quickUpdateIconCount,
  type QuickUpdateItem,
} from "../../shared/updates";
import { BottomSheet } from "./BottomSheet";
import { EmojiPicker } from "./EmojiPicker";
import { SortableList } from "./SortableList";
import { UpdateQuickIcon } from "./UpdateQuickIcon";

interface QuickUpdatesEditorProps {
  items: QuickUpdateItem[];
  readOnly?: boolean;
  disabled?: boolean;
  onChange: (items: QuickUpdateItem[]) => Promise<void>;
}

interface Draft {
  id: string | null;
  text: string;
  icon: string | null;
}

function emptyDraft(): Draft {
  return { id: null, text: "", icon: null };
}

function sameOrder(a: QuickUpdateItem[], b: QuickUpdateItem[]): boolean {
  return (
    a.length === b.length && a.every((item, index) => item.id === b[index]?.id)
  );
}

export function QuickUpdatesEditor({
  items,
  readOnly = false,
  disabled = false,
  onChange,
}: QuickUpdatesEditorProps) {
  const [localItems, setLocalItems] = useState(items);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const iconCount = quickUpdateIconCount(localItems);
  const persistLocked = disabled || saving || readOnly;

  async function persist(next: QuickUpdateItem[]): Promise<boolean> {
    setError("");
    setSaving(true);
    setLocalItems(next);
    try {
      await onChange(next);
      return true;
    } catch (err) {
      setLocalItems(items);
      setError(err instanceof Error ? err.message : "Could not save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    if (persistLocked || !canAddQuickUpdate(localItems)) return;
    setDraft(emptyDraft());
    setPickerOpen(false);
  }

  function openEdit(item: QuickUpdateItem) {
    if (persistLocked) return;
    setDraft({ id: item.id, text: item.text, icon: item.icon });
    setPickerOpen(false);
  }

  async function saveDraft() {
    if (!draft || persistLocked) return;
    const text = draft.text.trim();
    if (!text) {
      setError("Text is required");
      return;
    }

    const next = draft.id
      ? localItems.map((item) =>
          item.id === draft.id ? { ...item, text, icon: draft.icon } : item,
        )
      : [...localItems, { id: crypto.randomUUID(), text, icon: draft.icon }];

    const saved = await persist(next);
    if (saved) setDraft(null);
  }

  async function deleteDraft() {
    if (!draft?.id || persistLocked) return;
    if (!canRemoveQuickUpdate(localItems, draft.id)) return;
    const saved = await persist(localItems.filter((item) => item.id !== draft.id));
    if (saved) setDraft(null);
  }

  const canPickIcon = draft
    ? Boolean(draft.icon) ||
      (draft.id
        ? canAddQuickUpdateIcon(
            localItems.map((item) =>
              item.id === draft.id ? { ...item, icon: null } : item,
            ),
          )
        : canAddQuickUpdateIcon(localItems))
    : false;

  const canClearIcon = draft?.id
    ? canClearQuickUpdateIcon(
        localItems.map((item) =>
          item.id === draft.id ? { ...item, icon: draft.icon } : item,
        ),
        draft.id,
      )
    : Boolean(draft?.icon);

  return (
    <div className="quick-updates-editor">
      <p className="hint">
        {iconCount} with icons (4–10) · {localItems.length} total (max 20).
        Text-only items show when the drawer is open.
      </p>

      <SortableList
        items={localItems}
        getId={(item) => item.id}
        disabled={persistLocked}
        onReorder={setLocalItems}
        onDragEnd={(next) => {
          if (sameOrder(next, items)) return;
          persist(next).catch(console.error);
        }}
      >
        {(item, { handleProps, isDragging }) => (
          <div
            className={`quick-updates-row${isDragging ? " is-dragging" : ""}${readOnly ? " is-readonly" : ""}`}
          >
            {readOnly ? null : (
              <button
                type="button"
                className="quick-updates-handle"
                aria-label={`Reorder ${item.text}`}
                disabled={persistLocked}
                {...handleProps}
              >
                <span aria-hidden="true">⋮⋮</span>
              </button>
            )}
            <button
              type="button"
              className="quick-updates-row-main"
              disabled={persistLocked && !readOnly}
              onClick={() => {
                if (readOnly) return;
                openEdit(item);
              }}
            >
              {item.icon ? (
                <span className="quick-updates-row-icon" aria-hidden="true">
                  <UpdateQuickIcon icon={item.icon} />
                </span>
              ) : (
                <span className="quick-updates-row-icon is-empty" aria-hidden="true">
                  Aa
                </span>
              )}
              <span className="quick-updates-row-text">{item.text}</span>
            </button>
          </div>
        )}
      </SortableList>

      {readOnly ? null : (
        <button
          type="button"
          className="btn secondary"
          disabled={persistLocked || !canAddQuickUpdate(localItems)}
          onClick={openCreate}
        >
          Add quick update
        </button>
      )}

      {error ? <p className="hint error">{error}</p> : null}

      <BottomSheet
        open={draft != null && !pickerOpen}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit quick update" : "New quick update"}
      >
        {draft ? (
          <form
            className="composer quick-updates-sheet"
            onSubmit={(event) => {
              event.preventDefault();
              saveDraft().catch(console.error);
            }}
          >
            <label>
              Text
              <input
                type="text"
                value={draft.text}
                maxLength={UPDATE_MAX_LENGTH}
                required
                autoFocus
                disabled={saving}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, text: event.target.value } : current,
                  )
                }
              />
            </label>

            <div className="quick-updates-icon-field">
              <p className="hint">Icon (optional — shown on the closed drawer)</p>
              <div className="quick-updates-icon-actions">
                {draft.icon ? (
                  <span className="quick-updates-icon-preview" aria-hidden="true">
                    <UpdateQuickIcon icon={draft.icon} />
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn ghost"
                  disabled={saving || !canPickIcon}
                  onClick={() => setPickerOpen(true)}
                >
                  {draft.icon ? "Change icon" : "Choose icon"}
                </button>
                {draft.icon ? (
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={saving || !canClearIcon}
                    onClick={() =>
                      setDraft((current) =>
                        current ? { ...current, icon: null } : current,
                      )
                    }
                  >
                    Remove icon
                  </button>
                ) : null}
              </div>
              {!canPickIcon && !draft.icon ? (
                <p className="hint">You already have 10 icons.</p>
              ) : null}
              {draft.icon && !canClearIcon ? (
                <p className="hint">Keep at least 4 items with icons.</p>
              ) : null}
            </div>

            <div className="quick-updates-sheet-actions">
              <button type="submit" className="btn primary" disabled={saving}>
                Save
              </button>
              {draft.id && canRemoveQuickUpdate(localItems, draft.id) ? (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={saving}
                  onClick={() => {
                    deleteDraft().catch(console.error);
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
            {error ? <p className="hint error">{error}</p> : null}
            {draft.id && !canRemoveQuickUpdate(localItems, draft.id) ? (
              <p className="hint">Keep at least 4 items with icons.</p>
            ) : null}
          </form>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={draft != null && pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose an icon"
        tall
      >
        <EmojiPicker
          includePunk={false}
          busyLabel=""
          disabled={saving}
          onSelect={async (hexcode) => {
            setDraft((current) =>
              current ? { ...current, icon: hexcode } : current,
            );
            setPickerOpen(false);
          }}
        />
      </BottomSheet>
    </div>
  );
}
