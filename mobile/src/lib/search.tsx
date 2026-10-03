import * as Location from "expo-location";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { searchPlaces, type Loaded, type PlacesResponse } from "./api";
import { useProfile } from "./profile";
import { useT } from "./strings";
import { assess, type Assessment, type Category, type Place } from "./shared";

export interface Assessed {
  place: Place;
  assessment: Assessment;
}

// Stan wyszukiwania wspólny dla zakładek "Szukaj" i "Mapa".
interface SearchState {
  query: string;
  search: (q: string) => void;
  category?: Category;
  setCategory: (c?: Category) => void;
  near?: [number, number];
  locate: () => Promise<void>;
  onlyMatching: boolean;
  setOnlyMatching: (b: boolean) => void;
  loaded: Loaded<PlacesResponse> | null;
  loading: boolean;
  error: string;
  results: Assessed[];
}

const Ctx = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { profile, awaria, city } = useProfile();
  const { s, locale } = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [near, setNear] = useState<[number, number] | undefined>();
  const [onlyMatching, setOnlyMatching] = useState(false);
  const [loaded, setLoaded] = useState<Loaded<PlacesResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    searchPlaces({ q: query, category, near, awaria, city })
      .then(setLoaded)
      .catch(() => {
        setLoaded(null);
        setError(s.noServer);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, near, awaria, city]);

  const results = useMemo(() => {
    if (!loaded) return [];
    const all = loaded.data.places.map((place) => ({
      place,
      assessment: assess(place, profile, loaded.data.sources, new Date(), locale),
    }));
    return onlyMatching ? all.filter((r) => r.assessment.verdict === "meets") : all;
  }, [loaded, profile, onlyMatching, locale]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError(s.noLocation);
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setNear([pos.coords.latitude, pos.coords.longitude]);
  };

  return (
    <Ctx.Provider
      value={{
        query,
        search: setQuery,
        category,
        setCategory,
        near,
        locate,
        onlyMatching,
        setOnlyMatching,
        loaded,
        loading,
        error,
        results,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSearch(): SearchState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSearch poza SearchProvider");
  return v;
}
