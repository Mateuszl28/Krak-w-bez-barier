import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import type { Category } from "./shared";

// Zapisane miejsca — tylko na telefonie. Karta zapisanego miejsca jest też w pamięci
// podręcznej API (lib/api.ts), więc otwiera się bez zasięgu.
export interface Favorite {
  id: string;
  name: string;
  category: Category;
  city: string;
}

const KEY = "kbb-favorites";

const Ctx = createContext<{
  favorites: Favorite[];
  isFavorite: (id: string) => boolean;
  toggle: (f: Favorite) => void;
}>({ favorites: [], isFavorite: () => false, toggle: () => {} });

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setFavorites(JSON.parse(raw)))
      .catch(() => {});
  }, []);
  const toggle = (f: Favorite) => {
    setFavorites((list) => {
      const next = list.some((x) => x.id === f.id) ? list.filter((x) => x.id !== f.id) : [f, ...list];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  return (
    <Ctx.Provider value={{ favorites, isFavorite: (id) => favorites.some((x) => x.id === id), toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useFavorites = () => useContext(Ctx);
