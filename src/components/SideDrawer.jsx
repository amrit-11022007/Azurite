import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../context/ChatProvider";
import axios from "axios";
import { Search, Bell, LogOut, User, X, Users, Plus, Check } from "lucide-react";

const SideDrawer = () => {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Group chat form state
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchResult, setGroupSearchResult] = useState([]);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const { user, setSelectedChat, chats, setChats, notifications, setNotifications } = ChatState();
  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearch = async () => {
    if (!search) return;
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

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error(error);
      setLoadingChat(false);
    }
  };

  const handleNotifClick = (notif) => {
    setSelectedChat(notif.chat);
    setNotifications(notifications.filter((n) => n._id !== notif._id));
    setIsNotifOpen(false);
  };

  const handleGroupSearch = async (query) => {
    setGroupSearch(query);
    if (!query) { setGroupSearchResult([]); return; }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/users?search=${query}`, config);
      setGroupSearchResult(data);
    } catch (err) { console.error(err); }
  };

  const toggleGroupUser = (u) => {
    if (selectedGroupUsers.find((s) => s._id === u._id)) {
      setSelectedGroupUsers(selectedGroupUsers.filter((s) => s._id !== u._id));
    } else {
      setSelectedGroupUsers([...selectedGroupUsers, u]);
    }
  };

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
      <div className="flex justify-between items-center bg-white w-full p-3 px-4 border-b-2 border-blue-100 shadow-sm">
        {/* Search Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-full transition-colors min-h-[44px]"
        >
          <Search className="w-5 h-5 mr-2" />
          <span className="hidden md:inline font-medium">Search Users</span>
        </button>

        <h1 className="text-2xl font-black text-blue-800 tracking-tight">Azurite</h1>

        <div className="flex items-center space-x-2">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setIsNotifOpen(!isNotifOpen); setIsMenuOpen(false); }}
              className="relative p-2 text-blue-700 hover:bg-blue-50 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-blue-100 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 font-bold text-blue-900 text-sm">
                  Notifications {notifications.length > 0 && `(${notifications.length})`}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-blue-400 text-sm">No new notifications</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-start gap-3 transition-colors border-b border-blue-50 last:border-0"
                      >
                        <img
                          src={n.sender?.avatar || "/Portrait_Placeholder.png"}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                          alt=""
                        />
                        <div className="overflow-hidden">
                          <div className="font-semibold text-blue-900 text-sm truncate">
                            {n.chat?.isGroupChat ? n.chat.chatName : (n.sender?.name || n.sender?.userid)}
                          </div>
                          <div className="text-xs text-blue-600 truncate">
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

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsNotifOpen(false); }}
              className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 rounded-full py-1 pr-3 pl-1 transition-colors min-h-[44px]"
            >
              <img
                src={user?.avatar || "/Portrait_Placeholder.png"}
                alt={user?.userid}
                className="w-8 h-8 rounded-full border-2 border-blue-300 object-cover"
              />
              <span className="font-semibold text-blue-900 hidden sm:inline text-sm">{user?.name || user?.userid}</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-blue-50 overflow-hidden z-50">
                <button
                  onClick={() => { setIsMenuOpen(false); navigate("/profile"); }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center text-blue-800 min-h-[44px]"
                >
                  <User className="w-4 h-4 mr-2" /> Settings
                </button>
                <div className="h-px bg-blue-50"></div>
                <button
                  onClick={logoutHandler}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center text-red-600 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setIsDrawerOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-blue-100 flex justify-between items-center bg-blue-50">
              <h2 className="font-bold text-blue-900">Search Users</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="text-blue-500 hover:text-blue-800 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* New Group Chat button inside drawer */}
            <button
              onClick={() => { setIsDrawerOpen(false); setIsGroupModalOpen(true); }}
              className="mx-4 mt-4 flex items-center gap-2 bg-blue-800 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm min-h-[44px]"
            >
              <Users className="w-4 h-4" />
              New Group Chat
            </button>

            <div className="p-4 flex gap-2">
              <input
                type="text"
                placeholder="Search by name, ID or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-800 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                Go
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="text-center text-blue-400 py-4">Loading...</div>
              ) : (
                searchResult?.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => accessChat(u._id)}
                    className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors min-h-[60px]"
                  >
                    <img src={u.avatar || "/Portrait_Placeholder.png"} alt="" className="w-10 h-10 rounded-full mr-3 object-cover flex-shrink-0" />
                    <div>
                      <div className="font-bold text-blue-900">{u.name || u.userid}</div>
                      <div className="text-xs text-blue-600 truncate w-40">@{u.userid}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsGroupModalOpen(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-blue-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
              <h2 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                <Users className="w-5 h-5" /> New Group Chat
              </h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-blue-400 hover:text-blue-800 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />

              <input
                type="text"
                placeholder="Search users to add..."
                value={groupSearch}
                onChange={(e) => handleGroupSearch(e.target.value)}
                className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />

              {/* Selected users */}
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

              {/* Search results */}
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

            <div className="p-5 border-t border-blue-100">
              <button
                onClick={handleCreateGroup}
                disabled={groupLoading || !groupName || selectedGroupUsers.length < 2}
                className="w-full bg-blue-800 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
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
