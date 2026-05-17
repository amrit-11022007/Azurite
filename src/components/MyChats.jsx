import React, { useEffect, useState } from "react";
import { ChatState } from "../context/ChatProvider";
import axios from "axios";
import { getSender } from "../config/ChatLogics";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const { selectedChat, setSelectedChat, user, chats, setChats, notifications } = ChatState();

  const fetchChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
  }, [fetchAgain]);

  const getChatNotifCount = (chatId) => {
    return notifications.filter((n) => n.chat?._id === chatId || n.chat === chatId).length;
  };

  return (
    <div
      className={`flex flex-col bg-white w-full md:w-1/3 rounded-3xl shadow-lg border border-blue-100 overflow-hidden ${
        selectedChat ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="p-5 flex justify-between items-center border-b border-blue-100 bg-blue-50/50">
        <h2 className="text-xl font-bold text-blue-900">My Chats</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {chats ? (
          chats.map((chat) => {
            const notifCount = getChatNotifCount(chat._id);
            return (
              <div
                onClick={() => setSelectedChat(chat)}
                key={chat._id}
                className={`cursor-pointer px-4 py-3.5 rounded-2xl transition-all border flex items-start gap-3 min-h-[64px] ${
                  selectedChat === chat
                    ? "bg-blue-800 text-white shadow-md border-blue-800"
                    : "bg-blue-50 text-blue-900 hover:bg-blue-100 border-transparent"
                }`}
              >
                {/* Avatar */}
                {!chat.isGroupChat && chat.users && (
                  <img
                    src={
                      chat.users.find((u) => u._id !== loggedUser?._id)?.avatar ||
                      "/Portrait_Placeholder.png"
                    }
                    alt=""
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5"
                  />
                )}

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold truncate">
                      {!chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName}
                    </span>
                    {notifCount > 0 && (
                      <span className="flex-shrink-0 bg-blue-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {notifCount}
                      </span>
                    )}
                  </div>
                  {chat.latestMessage && (
                    <div
                      className={`text-xs truncate mt-0.5 ${
                        selectedChat === chat ? "text-blue-200" : "text-blue-500"
                      }`}
                    >
                      <span className="font-semibold">
                        {chat.latestMessage.sender?.name || chat.latestMessage.sender?.userid}:{" "}
                      </span>
                      {chat.latestMessage.type === "image" ? "📷 Image" : chat.latestMessage.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-blue-400 mt-10">Loading chats...</div>
        )}
      </div>
    </div>
  );
};

export default MyChats;
