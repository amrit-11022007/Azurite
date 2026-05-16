import React, { useState } from "react";
import { ChatState } from "../context/ChatProvider";
import SideDrawer from "../components/SideDrawer";
import MyChats from "../components/MyChats";
import ChatBox from "../components/ChatBox";

const ChatPage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const { user } = ChatState();

  return (
    <div className="w-full h-screen flex flex-col bg-blue-50 overflow-hidden">
      {user && <SideDrawer />}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && (
          <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </div>
    </div>
  );
};

export default ChatPage;
