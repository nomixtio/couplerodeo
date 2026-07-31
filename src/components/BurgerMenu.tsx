import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { fetchMe } from "../lib/api";
import { hasSession } from "../lib/partner";

const MENU_ITEMS = [
  { to: "/" as const, label: "Home" },
  { to: "/questions" as const, label: "Questions" },
  { to: "/updates" as const, label: "Updates" },
  { to: "/calendar" as const, label: "Calendar" },
  { to: "/location" as const, label: "Location" },
  { to: "/pairing" as const, label: "Pairing" },
  { to: "/settings" as const, label: "Settings" },
];

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!hasSession()) {
      setPartnerConnected(false);
      return;
    }

    fetchMe()
      .then((me) => setPartnerConnected(me.partnerConnected))
      .catch(() => setPartnerConnected(false));
  }, [pathname]);

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

  if (!hasSession()) return null;

  const visibleItems = MENU_ITEMS.filter(
    (item) => item.to !== "/pairing" || !partnerConnected,
  );

  return (
    <div className="burger-menu" ref={menuRef}>
      <button
        type="button"
        className="burger-button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="burger-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="burger-panel" aria-label="Main navigation">
            <ul>
              {visibleItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={pathname === item.to ? "active" : ""}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
