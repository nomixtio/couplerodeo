import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MENU_UNREAD_SECTIONS } from "../../shared/unread";
import { fetchMe } from "../lib/api";
import { requestBadgeRefresh } from "../lib/app-badge";
import { hasSession } from "../lib/partner";
import { useUnreadCounts } from "../lib/unread-counts";

const MENU_ITEMS = [
  { to: "/" as const, label: "Home" },
  { to: "/updates" as const, label: "Updates" },
  { to: "/notes" as const, label: "Notes" },
  { to: "/calendar" as const, label: "Calendar" },
  { to: "/plans" as const, label: "Plans" },
  { to: "/media" as const, label: "Media" },
  { to: "/pairing" as const, label: "Pairing" },
  { to: "/settings" as const, label: "Settings" },
];

function isMenuActive(pathname: string, itemPath: string) {
  if (itemPath === "/") return pathname === "/";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = useUnreadCounts();

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
    requestBadgeRefresh();
  }, [open]);

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
        className={`burger-button${unread.total > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
        {unread.total > 0 && (
          <span className="burger-button-badge" aria-hidden="true" />
        )}
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
              {visibleItems.map((item) => {
                const section = MENU_UNREAD_SECTIONS[item.to];
                const count = section ? unread[section] : 0;

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={isMenuActive(pathname, item.to) ? "active" : ""}
                      onClick={() => setOpen(false)}
                    >
                      <span>{item.label}</span>
                      {count > 0 && (
                        <span
                          className="menu-unread-badge"
                          aria-label={`${count} unread`}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
