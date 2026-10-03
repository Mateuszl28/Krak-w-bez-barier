"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PROFILE } from "@/lib/labels";
import type { Profile } from "@/lib/model";

// Profil to wyłącznie preferencje dotyczące barier — nie pytamy o niepełnosprawność.
// Zapisywany tylko w przeglądarce użytkownika (localStorage), nigdy na serwerze.
const KEY = "kbb-profile";

const ProfileContext = createContext<{ profile: Profile; setProfile: (p: Profile) => void }>({
  profile: DEFAULT_PROFILE,
  setProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    } catch {
      // brak dostępu do localStorage — zostajemy przy domyślnym profilu
    }
  }, []);

  const setProfile = (p: Profile) => {
    setProfileState(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {}
  };

  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
