import React from "react";
import { ChatState } from "../context/ChatProvider";
import SingleChat from "./SingleChat";

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = ChatState();

  return (
    <div className={`flex flex-col bg-white w-full md:w-2/3 rounded-3xl shadow-lg border border-blue-100 overflow-hidden ${selectedChat ? "flex" : "hidden md:flex"}`}>
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </div>
  );
};

export default ChatBox;
