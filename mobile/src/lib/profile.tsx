import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PROFILE, type Profile } from "./shared";

// Profil = preferencje dotyczące barier. Zapisywany tylko na telefonie.
const KEY = "kbb-profile";
const CITY_KEY = "kbb-city";

interface Value {
  profile: Profile;
  setProfile: (p: Profile) => void;
  /** Tryb demonstracyjny: symulowana awaria źródeł, np. "osm". Nie jest zapisywany. */
  awaria: string;
  setAwaria: (a: string) => void;
  /** Miasto (katalog danych na serwerze), zapamiętane na telefonie. */
  city: string;
  setCity: (c: string) => void;
}

const Ctx = createContext<Value>({
  profile: DEFAULT_PROFILE,
  setProfile: () => {},
  awaria: "",
  setAwaria: () => {},
  city: "krakow",
  setCity: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setState] = useState<Profile>(DEFAULT_PROFILE);
  const [awaria, setAwaria] = useState("");
  const [city, setCityState] = useState("krakow");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) }))
      .catch(() => {});
    AsyncStorage.getItem(CITY_KEY)
      .then((c) => c && setCityState(c))
      .catch(() => {});
  }, []);

  const setCity = (c: string) => {
    setCityState(c);
    AsyncStorage.setItem(CITY_KEY, c).catch(() => {});
  };

  const setProfile = (p: Profile) => {
    setState(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
  };

  return <Ctx.Provider value={{ profile, setProfile, awaria, setAwaria, city, setCity }}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
