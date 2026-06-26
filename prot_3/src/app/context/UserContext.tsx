import { createContext, useState, useContext, ReactNode } from 'react';

type Tier = 1 | 2 | 3;
export type TabKey = "Posts" | "Reels" | "KliqTube" | "KliqStream" | "Marketplace" | "Community" | "Reposts";
export type TabVisibility = "Everyone" | "Friends" | "Hidden";

interface UserContextType {
  tier: Tier;
  setTier: (tier: Tier) => void;
  tabVisibility: Record<TabKey, TabVisibility>;
  setTabVis: (tab: TabKey, vis: TabVisibility) => void;
}

const defaultTabVisibility: Record<TabKey, TabVisibility> = {
  Posts: "Everyone",
  Reels: "Everyone",
  KliqTube: "Everyone",
  KliqStream: "Everyone",
  Marketplace: "Everyone",
  Community: "Everyone",
  Reposts: "Everyone",
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<Tier>(1);
  const [tabVisibility, setTabVisibility] = useState<Record<TabKey, TabVisibility>>(defaultTabVisibility);

  const setTabVis = (tab: TabKey, vis: TabVisibility) =>
    setTabVisibility(prev => ({ ...prev, [tab]: vis }));

  return (
    <UserContext.Provider value={{ tier, setTier, tabVisibility, setTabVis }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};
