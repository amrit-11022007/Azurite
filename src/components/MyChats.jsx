import React, { useEffect, useState } from "react";
import { ChatState } from "../context/ChatProvider";
import axios from "axios";
import { getSender } from "../config/ChatLogics";
import { Plus } from "lucide-react";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();

  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
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

  return (
    <div className={`flex flex-col bg-white w-full md:w-1/3 rounded-3xl shadow-lg border border-blue-100 overflow-hidden ${selectedChat ? "hidden md:flex" : "flex"}`}>
      <div className="p-6 flex justify-between items-center border-b border-blue-100 bg-blue-50/50">
        <h2 className="text-xl font-bold text-blue-900">My Chats</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chats ? (
          chats.map((chat) => (
            <div
              onClick={() => setSelectedChat(chat)}
              key={chat._id}
              className={`cursor-pointer px-4 py-4 rounded-2xl transition-all border ${
                selectedChat === chat
                  ? "bg-blue-800 text-white shadow-md border-blue-800"
                  : "bg-blue-50 text-blue-900 hover:bg-blue-100 border-transparent"
              }`}
            >
              <div className="font-bold">
                {!chat.isGroupChat
                  ? getSender(loggedUser, chat.users)
                  : chat.chatName}
              </div>
              {chat.latestMessage && (
                <div className={`text-sm truncate mt-1 ${selectedChat === chat ? "text-blue-200" : "text-blue-600"}`}>
                  <span className="font-semibold">{chat.latestMessage.sender.name || chat.latestMessage.sender.userid}: </span>
                  {chat.latestMessage.type === 'image' ? '📷 Image' : chat.latestMessage.content}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center text-blue-400 mt-10">Loading chats...</div>
        )}
      </div>
    </div>
  );
};

export default MyChats;
