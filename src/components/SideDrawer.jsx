import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../context/ChatProvider";
import axios from "axios";
import { Search, Bell, LogOut, User, X } from "lucide-react";

const SideDrawer = () => {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user, setSelectedChat, chats, setChats } = ChatState();
  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearch = async () => {
    if (!search) return;
    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
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
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
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

  return (
    <>
      <div className="flex justify-between items-center bg-white w-full p-4 px-6 border-b-2 border-blue-100 shadow-sm">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors"
        >
          <Search className="w-5 h-5 mr-2" />
          <span className="hidden md:inline font-medium">Search Users</span>
        </button>

        <h1 className="text-2xl font-black text-blue-800 tracking-tight">
          Azurite
        </h1>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 rounded-full py-1 pr-4 pl-1 transition-colors"
            >
              <img
                src={user?.avatar || "./public/Portrait_Placeholder.png"}
                alt={user?.userid}
                className="w-8 h-8 rounded-full border-2 border-blue-300 object-cover"
              />
              <span className="font-semibold text-blue-900">
                {user?.name || user?.userid}
              </span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-blue-50 overflow-hidden z-50">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center text-blue-800"
                >
                  <User className="w-4 h-4 mr-2" /> Settings
                </button>
                <div className="h-px bg-blue-50"></div>
                <button
                  onClick={logoutHandler}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className="relative w-80 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col transform transition-transform">
            <div className="p-4 border-b border-blue-100 flex justify-between items-center bg-blue-50">
              <h2 className="font-bold text-blue-900">Search Users</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-blue-500 hover:text-blue-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 flex gap-2">
              <input
                type="text"
                placeholder="Search by name, ID or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-800 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="text-center text-blue-400 py-4">
                  Loading...
                </div>
              ) : (
                searchResult?.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => accessChat(u._id)}
                    className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors"
                  >
                    <img
                      src={u.avatar || "./public/Portrait_Placeholder.png"}
                      alt=""
                      className="w-10 h-10 rounded-full mr-3 object-cover"
                    />
                    <div>
                      <div className="font-bold text-blue-900">
                        {u.name || u.userid}
                      </div>
                      <div className="text-xs text-blue-600 truncate w-40">
                        @{u.userid}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideDrawer;
