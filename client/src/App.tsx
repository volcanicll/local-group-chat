import React, { useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme, darkTheme } from "./theme";
import { Chat } from "./components/Chat";

export function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : theme}>
      <CssBaseline />
      <Chat onToggleTheme={toggleDarkMode} darkMode={darkMode} />
    </ThemeProvider>
  );
}
