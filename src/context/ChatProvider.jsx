import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// ─── Create the context ──────────────────────────────────────────────────────
// This context is the global state store for the app.
// Every component that calls ChatState() can read and update:
//   user, selectedChat, chats, notifications, darkMode
const ChatContext = createContext();

// ─── VAPID Public Key ────────────────────────────────────────────────────────
// This key is used to subscribe the browser to Web Push notifications.
// It must match the VAPID_PUBLIC_KEY in your backend .env file.
const VAPID_PUBLIC_KEY = "BJKyVVySftckTW1tH60sW83jedyhyQvBAq5Y4j7kl8_pm_iVQ4hnJ11nJlEw70p8g243lwWhxfOliO1wqLc3y2Q";

// ─── Helper: convert base64 string to Uint8Array ─────────────────────────────
// The Web Push API requires the VAPID public key as a Uint8Array.
// This converts the base64url string (from your .env) to that format.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const ChatProvider = ({ children }) => {
  // ─── State ───────────────────────────────────────────────────────────────
  const [user, setUser] = useState();              // Logged-in user object (from localStorage)
  const [selectedChat, setSelectedChat] = useState(); // Currently open chat
  const [chats, setChats] = useState([]);           // All chats for the sidebar
  const [notifications, setNotifications] = useState([]); // In-app notification messages
  const [darkMode, setDarkMode] = useState(false);  // Dark mode toggle

  const navigate = useNavigate();

  // ─── Dark Mode: Apply & Persist ───────────────────────────────────────────
  // When darkMode changes, toggle the data-theme attribute on <html>.
  // This activates the dark CSS variables defined in index.css.
  // Also saves preference to localStorage so it survives page refreshes.
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ─── Subscribe browser to Web Push notifications ──────────────────────────
  // Called once after login. Requests permission, then subscribes through
  // the service worker, then saves the subscription object to the backend.
  // If the user denies or the browser doesn't support push, this silently exits.
  const subscribeToPush = async (currentUser) => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save the subscription to the backend so it can push notifications later
      await axios.post(
        "/api/users/push-subscription",
        { subscription },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
    } catch (err) {
      console.log("Push subscription failed:", err.message);
    }
  };

  // ─── On Mount: Load User + Dark Mode from localStorage ───────────────────
  // This runs once when the app starts. It reads any saved user session and
  // dark mode preference so the user doesn't get logged out on refresh.
  useEffect(() => {
    // Restore dark mode preference
    const savedDark = JSON.parse(localStorage.getItem("darkMode"));
    if (savedDark) setDarkMode(true);

    // Restore logged-in user
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    // If no user is logged in, redirect to login page
    if (!userInfo) {
      if (window.location.pathname !== "/") {
        navigate("/");
      }
    } else {
      // User is logged in — set up push notifications
      subscribeToPush(userInfo);
    }
  }, [navigate]);

  // ─── Provide context to all child components ─────────────────────────────
  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        selectedChat,
        setSelectedChat,
        chats,
        setChats,
        notifications,
        setNotifications,
        darkMode,
        setDarkMode,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// ─── Custom hook to consume the context ──────────────────────────────────────
// Usage in any component: const { user, darkMode } = ChatState();
export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
