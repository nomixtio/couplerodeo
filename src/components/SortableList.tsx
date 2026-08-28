import { useRef, useState, type ReactNode } from "react";

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  disabled?: boolean;
  onReorder: (items: T[]) => void;
  onDragEnd?: (items: T[]) => void;
  children: (
    item: T,
    ctx: {
      handleProps: {
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
        onLostPointerCapture: () => void;
      };
      isDragging: boolean;
    },
  ) => ReactNode;
}

function permute<T>(items: T[], getId: (item: T) => string, orderedIds: string[]): T[] {
  const byId = new Map(items.map((item) => [getId(item), item]));
  return orderedIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export function SortableList<T>({
  items,
  getId,
  disabled = false,
  onReorder,
  onDragEnd,
  children,
}: SortableListProps<T>) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const dragRef = useRef<{
    id: string;
    sourceItems: T[];
    orderedIds: string[];
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  const sourceItems = dragRef.current?.sourceItems ?? items;
  const visualIds = orderedIds ?? items.map(getId);
  const orderById = new Map(visualIds.map((id, index) => [id, index]));

  function itemIndexAtY(clientY: number): number {
    const list = listRef.current;
    if (!list) return 0;
    const rows = [...list.querySelectorAll<HTMLElement>("[data-sortable-id]")];
    const mids = rows
      .map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          id: row.dataset.sortableId ?? "",
          mid: rect.top + rect.height / 2,
        };
      })
      .sort((a, b) => a.mid - b.mid);
    let index = mids.length - 1;
    for (let i = 0; i < mids.length; i++) {
      if (clientY < mids[i].mid) {
        index = i;
        break;
      }
    }
    return Math.max(0, index);
  }

  function moveTo(clientY: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const from = drag.orderedIds.indexOf(drag.id);
    const to = itemIndexAtY(clientY);
    if (from < 0 || from === to) return;
    const nextIds = [...drag.orderedIds];
    const [moved] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, moved);
    drag.orderedIds = nextIds;
    setOrderedIds(nextIds);
    onReorder(permute(drag.sourceItems, getId, nextIds));
  }

  function endDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    const next = permute(drag.sourceItems, getId, drag.orderedIds);
    dragRef.current = null;
    setDraggingId(null);
    setOrderedIds(null);
    onDragEnd?.(next);
  }

  return (
    <ul ref={listRef} className="sortable-list">
      {sourceItems.map((item) => {
        const id = getId(item);
        return (
          <li
            key={id}
            data-sortable-id={id}
            style={{ order: orderById.get(id) ?? 0 }}
          >
            {children(item, {
              isDragging: draggingId === id,
              handleProps: {
                onPointerDown: (event) => {
                  if (disabled) return;
                  if (event.pointerType === "mouse" && event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  const ids = itemsRef.current.map(getId);
                  dragRef.current = {
                    id,
                    sourceItems: itemsRef.current,
                    orderedIds: ids,
                  };
                  setOrderedIds(ids);
                  setDraggingId(id);
                  event.currentTarget.setPointerCapture(event.pointerId);
                },
                onPointerMove: (event) => {
                  if (!dragRef.current) return;
                  moveTo(event.clientY);
                },
                onPointerUp: endDrag,
                onPointerCancel: endDrag,
                onLostPointerCapture: endDrag,
              },
            })}
          </li>
        );
      })}
    </ul>
  );
}
