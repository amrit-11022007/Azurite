import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <div className="App flex min-h-screen">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/chats" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  );
}

export default App;
