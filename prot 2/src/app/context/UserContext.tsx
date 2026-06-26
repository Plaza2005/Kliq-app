import { createContext, useState, useContext, ReactNode } from 'react';

type Tier = 1 | 2 | 3;

interface UserContextType {
  tier: Tier;
  setTier: (tier: Tier) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<Tier>(1);
  
  return (
    <UserContext.Provider value={{ tier, setTier }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};
