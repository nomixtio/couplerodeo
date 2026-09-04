import { createContext, useContext, type ReactNode } from "react";
import {
  EMPTY_UNREAD_COUNTS,
  type UnreadCounts,
} from "../../shared/unread";

export const UnreadCountsContext = createContext<UnreadCounts>(EMPTY_UNREAD_COUNTS);

export function useUnreadCounts() {
  return useContext(UnreadCountsContext);
}

export function UnreadCountsProvider({
  counts,
  children,
}: {
  counts: UnreadCounts;
  children: ReactNode;
}) {
  return (
    <UnreadCountsContext.Provider value={counts}>
      {children}
    </UnreadCountsContext.Provider>
  );
}
