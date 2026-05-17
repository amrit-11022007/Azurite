import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import { ChatState } from "./context/ChatProvider";

// ─── App Root Component ────────────────────────────────────────────────────
// This is the top-level component rendered by main.jsx.
// It reads darkMode from the global context and applies it as a CSS class
// to the wrapper div. All child components inherit dark mode styling.
function App() {
  const { darkMode } = ChatState();

  return (
    // The "dark-wrapper" div covers the full screen.
    // When darkMode is true, we add "dark" so Tailwind dark: classes activate.
    // We also use the CSS variable system from index.css via dm-* classes.
    <div className={`App flex min-h-screen ${darkMode ? "dark" : ""}`}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/chats" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  );
}

export default App;
