import React, { useEffect, useState } from "react";
import { ChatState } from "../context/ChatProvider";
import axios from "axios";
import { getSender } from "../config/ChatLogics";

// ─────────────────────────────────────────────────────────────────────────────
// MyChats Component
//
// This component displays the list of active chat rooms (inbox) on the left.
// Key features:
//   • Renders both one-to-one and group chats.
//   • Displays correct avatar: group profile picture or recipient's profile picture.
//   • Shows the latest message text or "📷 Image" label in real-time.
//   • Renders dynamic unread message count badges.
//   • Toggles visibility on mobile: hides when a chat room is open.
//   • Fully supports dark theme.
// ─────────────────────────────────────────────────────────────────────────────
const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();

  // Consume state from context provider
  const { selectedChat, setSelectedChat, user, chats, setChats, notifications } = ChatState();

  // ─── Fetch chat list from backend ──────────────────────────────────────────
  const fetchChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  // Run on component mount and whenever `fetchAgain` changes (e.g. after sending/receiving message)
  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
  }, [fetchAgain]);

  // ─── Helper: Get unread count for a given chat ────────────────────────────
  const getChatNotifCount = (chatId) => {
    return notifications.filter((n) => n.chat?._id === chatId || n.chat === chatId).length;
  };

  return (
    <div
      className={`flex flex-col w-full md:w-1/3 rounded-3xl shadow-lg border overflow-hidden transition-all duration-300 ${
        selectedChat ? "hidden md:flex" : "flex"
      }`}
      style={{
        backgroundColor: "var(--bg-primary)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Title Header */}
      <div
        className="p-5 flex justify-between items-center border-b"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>My Chats</h2>
      </div>

      {/* Chat List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {chats ? (
          chats.map((chat) => {
            const notifCount = getChatNotifCount(chat._id);
            const isSelected = selectedChat?._id === chat._id;

            return (
              <div
                onClick={() => setSelectedChat(chat)}
                key={chat._id}
                className={`cursor-pointer px-4 py-3.5 rounded-2xl transition-all border flex items-start gap-3 min-h-[64px] ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md border-blue-600"
                    : "hover:opacity-90 border-transparent"
                }`}
                style={
                  !isSelected
                    ? {
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                      }
                    : {}
                }
              >
                {/* ── Chat Avatar ── */}
                {chat.isGroupChat ? (
                  // For group chats: display the group's profile picture or placeholder
                  <img
                    src={chat.groupAvatar || "/Portrait_Placeholder.png"}
                    alt="Group Avatar"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5"
                  />
                ) : (
                  // For 1-on-1 chats: display the recipient's avatar or placeholder
                  chat.users && (
                    <img
                      src={
                        chat.users.find((u) => u._id !== loggedUser?._id)?.avatar ||
                        "/Portrait_Placeholder.png"
                      }
                      alt="User Avatar"
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />
                  )
                )}

                {/* ── Chat Title & Latest Message ── */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold truncate">
                      {!chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName}
                    </span>
                    {/* Notification Count Badge */}
                    {notifCount > 0 && (
                      <span className="flex-shrink-0 bg-blue-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {notifCount}
                      </span>
                    )}
                  </div>

                  {/* Render snippet of the latest message */}
                  {chat.latestMessage && (
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{
                        color: isSelected ? "rgba(255, 255, 255, 0.75)" : "var(--text-secondary)",
                      }}
                    >
                      <span className="font-semibold">
                        {chat.latestMessage.sender?._id === loggedUser?._id
                          ? "You: "
                          : `${chat.latestMessage.sender?.name || chat.latestMessage.sender?.userid}: `}
                      </span>
                      {chat.latestMessage.type === "image" ? "📷 Image" : chat.latestMessage.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center mt-10" style={{ color: "var(--text-secondary)" }}>
            Loading chats...
          </div>
        )}
      </div>
    </div>
  );
};

export default MyChats;
