import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PROFILE, type Locale, type Profile } from "./shared";

// Profil = preferencje dotyczące barier. Zapisywany tylko na telefonie.
const KEY = "kbb-profile";
const CITY_KEY = "kbb-city";
const LOCALE_KEY = "kbb-locale";

function deviceLocale(): Locale {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith("pl") ? "pl" : "en";
  } catch {
    return "pl";
  }
}

interface Value {
  profile: Profile;
  setProfile: (p: Profile) => void;
  /** Tryb demonstracyjny: symulowana awaria źródeł, np. "osm". Nie jest zapisywany. */
  awaria: string;
  setAwaria: (a: string) => void;
  /** Miasto (katalog danych na serwerze), zapamiętane na telefonie. */
  city: string;
  setCity: (c: string) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<Value>({
  profile: DEFAULT_PROFILE,
  setProfile: () => {},
  awaria: "",
  setAwaria: () => {},
  city: "krakow",
  setCity: () => {},
  locale: "pl",
  setLocale: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setState] = useState<Profile>(DEFAULT_PROFILE);
  const [awaria, setAwaria] = useState("");
  const [city, setCityState] = useState("krakow");
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) }))
      .catch(() => {});
    AsyncStorage.getItem(CITY_KEY)
      .then((c) => c && setCityState(c))
      .catch(() => {});
    AsyncStorage.getItem(LOCALE_KEY)
      .then((l) => (l === "pl" || l === "en") && setLocaleState(l))
      .catch(() => {});
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(LOCALE_KEY, l).catch(() => {});
  };

  const setCity = (c: string) => {
    setCityState(c);
    AsyncStorage.setItem(CITY_KEY, c).catch(() => {});
  };

  const setProfile = (p: Profile) => {
    setState(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
  };

  return <Ctx.Provider value={{ profile, setProfile, awaria, setAwaria, city, setCity, locale, setLocale }}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
