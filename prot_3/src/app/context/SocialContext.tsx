import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { api } from "../api/client";

interface SocialContextType {
  followed: Set<string>;
  toggleFollow: (username: string) => Promise<void>;
  isFollowing: (username: string) => boolean;
  seedFollowing: (username: string, value: boolean) => void;
  myList: Set<number>;
  toggleMyList: (id: number) => void;
  inMyList: (id: number) => boolean;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [myList, setMyList] = useState<Set<number>>(new Set());

  const seedFollowing = useCallback((username: string, value: boolean) => {
    setFollowed(prev => {
      if (prev.has(username) === value) return prev;
      const next = new Set(prev);
      value ? next.add(username) : next.delete(username);
      return next;
    });
  }, []);

  const toggleFollow = useCallback(async (username: string) => {
    const wasFollowing = followed.has(username);
    // Optimistic update
    setFollowed(prev => {
      const next = new Set(prev);
      wasFollowing ? next.delete(username) : next.add(username);
      return next;
    });
    try {
      if (wasFollowing) {
        await api.delete(`/users/${username}/follow`);
      } else {
        await api.post(`/users/${username}/follow`, {});
      }
    } catch {
      // Revert on failure
      setFollowed(prev => {
        const next = new Set(prev);
        wasFollowing ? next.add(username) : next.delete(username);
        return next;
      });
    }
  }, [followed]);

  const toggleMyList = (id: number) =>
    setMyList(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <SocialContext.Provider value={{
      followed,
      toggleFollow,
      isFollowing: (username) => followed.has(username),
      seedFollowing,
      myList,
      toggleMyList,
      inMyList: (id) => myList.has(id),
    }}>
      {children}
    </SocialContext.Provider>
  );
}

export const useSocial = () => {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be within SocialProvider");
  return ctx;
};
