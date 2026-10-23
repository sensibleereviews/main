// Client session context — who am I, which workspace, impersonation state
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // tenant: owner | manager | observer | member · platform: platform_admin | platform_manager | platform_observer | member
  roleName?: string | null; // set when on a custom role
  locationIds?: string[]; // assigned location ids for branch-level access
  permissions?: string[]; // effective permission ids ("*" = everything)
  impersonatedBy?: string | null;
  tenant: null | {
    id: string;
    name: string;
    slug: string;
    status: string;
    planId: string;
    planName: string;
    mrrInr: number;
    billingCycle: string;
    settings: TenantSettings;
    onboardingDone: boolean;
    trialEndsAt: string | null;
  };
};

export type TenantSettings = {
  tone?: string;
  autoApproveThreshold?: number;
  signature?: string;
  category?: string;
  website?: string;
  digestLanguage?: string;
  greeting?: string;
  staff?: { name: string; score: number; mentions: number; trend: string }[];
  notifs?: { digest: boolean; negative: boolean; weekly: boolean; billing: boolean };
  onboarding?: { done: boolean; whatsappName?: string; whatsappPhone?: string };
};

type MeResponse = { user: SessionUser | null };

type SessionCtx = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<SessionCtx>({ user: null, loading: true, refresh: async () => null, logout: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await api.get<MeResponse>("/api/auth/me");
      setUser(d.user);
      return d.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ user, loading, refresh, logout }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
