import { create } from 'zustand';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export type Tier = 1 | 2 | 3;

export const TIER_NAMES: Record<Tier, string> = {
  1: 'Starter',
  2: 'Creator',
  3: 'Pro',
};

export const TIER_PRICES: Record<Tier, string> = {
  1: 'Free',
  2: '$9.99/mo',
  3: '$24.99/mo',
};

export const GLOW_PRESETS = [
  { name: 'Blue',   color: '#0095F6' },
  { name: 'Rose',   color: '#ED4956' },
  { name: 'Purple', color: '#C13584' },
  { name: 'Green',  color: '#78CF7C' },
  { name: 'Gold',   color: '#DAA520' },
  { name: 'White',  color: '#FFFFFF' },
] as const;

export const TIER_FEATURES: Record<Tier, string[]> = {
  1: [
    'Short & long form content',
    'Chat & communities',
    'Marketplace — buy & sell',
  ],
  2: [
    'Everything in Starter',
    'Open your storefront',
    'Go Live broadcasting',
    'Premium streaming',
    'Basic analytics',
  ],
  3: [
    'Everything in Creator',
    'Advanced analytics suite',
    'Ad-free experience',
    'Storefront priority placement',
    'Dedicated support',
  ],
};

interface AppState {
  session: Session | null;
  user: User | null;
  tier: Tier;
  glowColor: string;
  theme: 'dark' | 'dim';
  profileName: string;
  profileHandle: string;
  profileBio: string;
  setSession: (session: Session | null) => void;
  setTier: (tier: Tier) => void;
  setGlowColor: (color: string) => void;
  setTheme: (theme: 'dark' | 'dim') => void;
  setProfile: (p: Partial<{ name: string; handle: string; bio: string }>) => void;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  user: null,
  tier: 1,
  glowColor: '#0095F6',
  theme: 'dark',
  profileName: 'SuperApp User',
  profileHandle: 'superuser',
  profileBio: 'Building Africa\'s everything platform. Creator. Entrepreneur.',
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setTier: (tier) => set({ tier }),
  setGlowColor: (glowColor) => set({ glowColor }),
  setTheme: (theme) => set({ theme }),
  setProfile: (p) => set((s) => ({
    profileName: p.name ?? s.profileName,
    profileHandle: p.handle ?? s.profileHandle,
    profileBio: p.bio ?? s.profileBio,
  })),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, tier: 1 });
  },
}));

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'buy' | 'sell';
  token: string;
  amount: number;
  usdValue: number;
  timestamp: number;
  address?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface WalletState {
  balances: Record<string, number>;
  transactions: Transaction[];
  setBalance: (token: string, amount: number) => void;
  addTransaction: (tx: Transaction) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balances: { BTC: 0, ETH: 0, USDT: 0, NGN: 0, KES: 0, GHS: 0 },
  transactions: [],
  setBalance: (token, amount) =>
    set((s) => ({ balances: { ...s.balances, [token]: amount } })),
  addTransaction: (tx) =>
    set((s) => ({ transactions: [tx, ...s.transactions] })),
}));
