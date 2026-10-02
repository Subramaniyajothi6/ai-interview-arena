"use client";

import { createContext, useContext, useState } from "react";

// The profile is read-only until the user clicks "Edit profile". Everything
// that can change it (fields, skills, photo) reads this shared state.
const EditMode = createContext<{ editing: boolean; setEditing: (v: boolean) => void }>({
  editing: false,
  setEditing: () => {},
});

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return <EditMode.Provider value={{ editing, setEditing }}>{children}</EditMode.Provider>;
}

export const useEditMode = () => useContext(EditMode);
