import { createContext, useContext, useEffect, useState } from 'react';
import { get } from '../api.js';

const CategoriesContext = createContext([]);

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    get('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);
  return <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>;
}

export const useCategories = () => useContext(CategoriesContext);
