import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../context/ChatProvider";
import axios from "axios";
import { Search, Bell, LogOut, User, X, Users, Check, Moon, Sun } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SideDrawer Component
//
// This component forms the top navigation bar of the application.
// It contains:
//   1. Search Users trigger (opens full-height sliding drawer)
//   2. Brand logo ("Azurite")
//   3. Dark/Light theme toggle switch
//   4. Notification bell with unread badge (closes on outside click)
//   5. Profile menu dropdown containing Settings and Logout
// ─────────────────────────────────────────────────────────────────────────────
const SideDrawer = () => {
  // ─── Local State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");                   // User search input text
  const [searchResult, setSearchResult] = useState([]);       // Users returned by API
  const [loading, setLoading] = useState(false);             // Loader for user search
  const [loadingChat, setLoadingChat] = useState(false);       // Loader while creating/fetching 1-on-1 chat
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);     // User search side-drawer toggle
  const [isMenuOpen, setIsMenuOpen] = useState(false);         // Profile dropdown menu toggle
  const [isNotifOpen, setIsNotifOpen] = useState(false);       // Notification panel toggle
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); // New Group modal toggle

  // Group chat creation states
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchResult, setGroupSearchResult] = useState([]);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);

  // Consume global state from context provider
  const {
    user,
    setSelectedChat,
    chats,
    setChats,
    notifications,
    setNotifications,
    darkMode,
    setDarkMode,
  } = ChatState();

  const navigate = useNavigate();

  // ─── Outside Click References & Listeners ──────────────────────────────────
  // Used to close the notification dropdown and profile menu when clicking outside of them
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If notification box is open and click was outside of it, close it
      if (isNotifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      // If profile menu is open and click was outside, close it
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isNotifOpen, isMenuOpen]);

  // ─── Logout handler ───────────────────────────────────────────────────────
  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  // ─── Search users for 1-on-1 chats ────────────────────────────────────────
  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/users?search=${search}`, config);
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  // ─── Open or create a chat room with a selected user ──────────────────────
  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);
      // Prepend to chats list if not already present
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      setIsDrawerOpen(false); // Close search drawer
    } catch (error) {
      console.error(error);
      setLoadingChat(false);
    }
  };

  // ─── Click notification item ──────────────────────────────────────────────
  const handleNotifClick = (notif) => {
    setSelectedChat(notif.chat);
    // Remove clicked notification from the list
    setNotifications(notifications.filter((n) => n._id !== notif._id));
    setIsNotifOpen(false);
  };

  // ─── Group chat: search members to add ────────────────────────────────────
  const handleGroupSearch = async (query) => {
    setGroupSearch(query);
    if (!query.trim()) { setGroupSearchResult([]); return; }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/users?search=${query}`, config);
      setGroupSearchResult(data);
    } catch (err) { console.error(err); }
  };

  // ─── Group chat: select / deselect user ───────────────────────────────────
  const toggleGroupUser = (u) => {
    if (selectedGroupUsers.find((s) => s._id === u._id)) {
      setSelectedGroupUsers(selectedGroupUsers.filter((s) => s._id !== u._id));
    } else {
      setSelectedGroupUsers([...selectedGroupUsers, u]);
    }
  };

  // ─── Group chat: submit creation request ──────────────────────────────────
  const handleCreateGroup = async () => {
    if (!groupName || selectedGroupUsers.length < 2) {
      alert("Please enter a group name and select at least 2 users.");
      return;
    }
    try {
      setGroupLoading(true);
      const config = {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.post(
        "/api/chat/group",
        { name: groupName, users: JSON.stringify(selectedGroupUsers.map((u) => u._id)) },
        config
      );
      setChats([data, ...chats]);
      setSelectedChat(data);
      setGroupLoading(false);
      setIsGroupModalOpen(false);
      // Reset form fields
      setGroupName("");
      setSelectedGroupUsers([]);
      setGroupSearchResult([]);
    } catch (err) {
      console.error(err);
      setGroupLoading(false);
    }
  };

  return (
    <>
      {/* ─── Top Navigation Bar ────────────────────────────────────────────── */}
      <div
        className="flex justify-between items-center w-full p-3 px-4 border-b-2 shadow-sm transition-colors"
        style={{
          backgroundColor: "var(--header-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        {/* Search Users button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center hover:opacity-85 px-3 py-2 rounded-full transition-all min-h-[44px] text-blue-600"
          style={{ background: "var(--input-bg)" }}
        >
          <Search className="w-5 h-5 mr-2" />
          <span className="hidden md:inline font-semibold text-sm">Search Users</span>
        </button>

        {/* Brand Logo */}
        <h1 className="text-2xl font-black tracking-tight text-blue-600">Azurite</h1>

        {/* Action Controls (Dark Mode Toggle, Notifications Bell, Profile Dropdown) */}
        <div className="flex items-center space-x-2">
          {/* Dark Mode Toggle Icon */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:opacity-80 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-500"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notification dropdown container */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setIsNotifOpen(!isNotifOpen); setIsMenuOpen(false); }}
              className="relative p-2 hover:opacity-80 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-500"
            >
              <Bell className="w-5 h-5" />
              {/* Red unread count badge */}
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotifOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl border z-50 overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div
                  className="px-4 py-3 border-b font-bold text-sm"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  Notifications {notifications.length > 0 && `(${notifications.length})`}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                    No new notifications
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b last:border-0 hover:opacity-80"
                        style={{
                          borderColor: "var(--border-color)",
                        }}
                      >
                        <img
                          src={n.sender?.avatar || "/Portrait_Placeholder.png"}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                          alt=""
                        />
                        <div className="overflow-hidden">
                          <div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                            {n.chat?.isGroupChat ? n.chat.chatName : (n.sender?.name || n.sender?.userid)}
                          </div>
                          <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {n.type === "image" ? "📷 Image" : n.content}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Menu dropdown container */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsNotifOpen(false); }}
              className="flex items-center space-x-2 rounded-full py-1 pr-3 pl-1 transition-all min-h-[44px]"
              style={{ background: "var(--input-bg)" }}
            >
              <img
                src={user?.avatar || "/Portrait_Placeholder.png"}
                alt={user?.userid}
                className="w-8 h-8 rounded-full border border-blue-300 object-cover"
              />
              <span className="font-semibold hidden sm:inline text-sm text-blue-700">{user?.name || user?.userid}</span>
            </button>

            {/* Profile Dropdown Panel */}
            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border overflow-hidden z-50"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <button
                  onClick={() => { setIsMenuOpen(false); navigate("/profile"); }}
                  className="w-full text-left px-4 py-3 flex items-center min-h-[44px] text-sm hover:opacity-85"
                  style={{ color: "var(--text-primary)" }}
                >
                  <User className="w-4 h-4 mr-2 text-blue-500" /> Settings
                </button>
                <div className="h-px" style={{ backgroundColor: "var(--border-color)" }}></div>
                <button
                  onClick={logoutHandler}
                  className="w-full text-left px-4 py-3 flex items-center min-h-[44px] text-sm text-red-500 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Search sliding drawer ─────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setIsDrawerOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col transition-all duration-300"
            style={{ backgroundColor: "var(--bg-primary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-4 border-b flex justify-between items-center"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
              }}
            >
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Search Users</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="text-blue-500 hover:text-blue-700 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Create new group button */}
            <button
              onClick={() => { setIsDrawerOpen(false); setIsGroupModalOpen(true); }}
              className="mx-4 mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm min-h-[44px]"
            >
              <Users className="w-4 h-4" />
              New Group Chat
            </button>

            {/* Search Input bar */}
            <div className="p-4 flex gap-2">
              <input
                type="text"
                placeholder="Search by name, ID or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base min-h-[44px]"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Go
              </button>
            </div>

            {/* Search Results list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="text-center text-sm py-4" style={{ color: "var(--text-secondary)" }}>Loading...</div>
              ) : (
                searchResult?.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => accessChat(u._id)}
                    className="flex items-center p-3 rounded-xl cursor-pointer transition-colors min-h-[60px]"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    <img src={u.avatar || "/Portrait_Placeholder.png"} alt="" className="w-10 h-10 rounded-full mr-3 object-cover flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{u.name || u.userid}</div>
                      <div className="text-xs truncate w-40" style={{ color: "var(--text-secondary)" }}>@{u.userid}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Group Chat Creation Modal ─────────────────────────────────────── */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsGroupModalOpen(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
            style={{
              backgroundColor: "var(--bg-primary)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-5 border-b flex justify-between items-center rounded-t-2xl"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
              }}
            >
              <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Users className="w-5 h-5 text-blue-600" /> New Group Chat
              </h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-blue-400 hover:text-blue-700 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />

              <input
                type="text"
                placeholder="Search users to add..."
                value={groupSearch}
                onChange={(e) => handleGroupSearch(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />

              {/* Selected users badge list */}
              {selectedGroupUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGroupUsers.map((u) => (
                    <span
                      key={u._id}
                      onClick={() => toggleGroupUser(u)}
                      className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                      {u.name || u.userid} <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}

              {/* Search results under group creation */}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {groupSearchResult.map((u) => {
                  const isSelected = !!selectedGroupUsers.find((s) => s._id === u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleGroupUser(u)}
                      className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors min-h-[52px] ${isSelected ? "bg-blue-100 border border-blue-300" : "hover:bg-blue-50"}`}
                    >
                      <img src={u.avatar || "/Portrait_Placeholder.png"} alt="" className="w-8 h-8 rounded-full mr-3 object-cover" />
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900 text-sm">{u.name || u.userid}</div>
                        <div className="text-xs text-blue-500">@{u.userid}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-700" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-5 border-t" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={handleCreateGroup}
                disabled={groupLoading || !groupName || selectedGroupUsers.length < 2}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {groupLoading ? "Creating..." : `Create Group (${selectedGroupUsers.length} members)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideDrawer;
