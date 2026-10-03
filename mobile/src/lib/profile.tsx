import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PROFILE, type Profile } from "./shared";

// Profil = preferencje dotyczące barier. Zapisywany tylko na telefonie.
const KEY = "kbb-profile";

interface Value {
  profile: Profile;
  setProfile: (p: Profile) => void;
  /** Tryb demonstracyjny: symulowana awaria źródeł, np. "osm". Nie jest zapisywany. */
  awaria: string;
  setAwaria: (a: string) => void;
}

const Ctx = createContext<Value>({
  profile: DEFAULT_PROFILE,
  setProfile: () => {},
  awaria: "",
  setAwaria: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setState] = useState<Profile>(DEFAULT_PROFILE);
  const [awaria, setAwaria] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const setProfile = (p: Profile) => {
    setState(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
  };

  return <Ctx.Provider value={{ profile, setProfile, awaria, setAwaria }}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
