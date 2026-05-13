import { createContext, useContext } from "react";

export const SecretShopSearchContext = createContext<{
  search: string;
  setSearch: (s: string) => void;
}>({ search: "", setSearch: () => {} });

export function useSecretShopSearch() {
  return useContext(SecretShopSearchContext);
}
