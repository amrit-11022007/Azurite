import React, { useEffect, useState, useRef } from "react";
import { ChatState } from "../context/ChatProvider";
import { getSender, getSenderFull } from "../config/ChatLogics";
import axios from "axios";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Image as ImageIcon,
} from "lucide-react";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

const ENDPOINT = "http://localhost:5000";
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);

  const { selectedChat, setSelectedChat, user } = ChatState();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    socket.on("message status update", (updatedMessage) => {
      setMessages((prev) => 
        prev.map((m) => m._id === updatedMessage._id ? updatedMessage : m)
      );
    });

    socket.on("chat read", ({ chatId, userId }) => {
      setMessages((prev) => 
        prev.map((m) => {
          if(m.chat._id === chatId || m.chat === chatId) {
            return { ...m, status: 'read' };
          }
          return m;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      setLoading(true);
      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config,
      );
      setMessages(data);
      setLoading(false);
      socket.emit("join chat", selectedChat._id);
      socket.emit("messages read", { chatId: selectedChat._id, userId: user._id });
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const handleNewMessage = (newMessageRecieved) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        socket.emit("message delivered", newMessageRecieved._id);
        setFetchAgain(!fetchAgain);
      } else {
        setMessages([...messages, newMessageRecieved]);
        socket.emit("messages read", { chatId: selectedChat._id, userId: user._id });
        setTimeout(scrollToBottom, 100);
      }
    };

    socket.on("message recieved", handleNewMessage);

    return () => {
      socket.off("message recieved", handleNewMessage);
    };
  }, [messages, selectedChatCompare]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageFile) return;

    setShowEmojiPicker(false);
    socket.emit("stop typing", selectedChat._id);

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      let type = "text";
      let content = newMessage;

      // Handle Image Upload
      if (imageFile) {
        type = "image";
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadConfig = {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "multipart/form-data",
          },
        };
        const uploadRes = await axios.post(
          "/api/message/upload",
          formData,
          uploadConfig,
        );
        content = uploadRes.data.url;
        setImageFile(null); // Clear after upload
      } else {
        setNewMessage(""); // Clear text input
      }

      // Optimistic UI for fast sending visual feedback (status sending)
      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        content,
        chat: selectedChat,
        sender: user,
        type,
        status: 'sending'
      };
      setMessages([...messages, optimisticMessage]);
      setTimeout(scrollToBottom, 10);

      const { data } = await axios.post(
        "/api/message",
        { content, chatId: selectedChat._id, type },
        config,
      );

      socket.emit("new message", data);
      setMessages((prev) => prev.map(m => m._id === tempId ? data : m));
      setFetchAgain(!fetchAgain);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.map(m => m.status === 'sending' ? { ...m, status: 'failed' } : m));
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File must be smaller than 5MB");
        return;
      }
      setImageFile(file);
    }
  };

  return (
    <>
      {selectedChat ? (
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex items-center p-4 bg-blue-50 border-b border-blue-100 justify-between">
            <div className="flex items-center">
              <button
                className="md:hidden mr-3 text-blue-800 hover:bg-blue-200 p-2 rounded-full transition-colors"
                onClick={() => setSelectedChat("")}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center">
                {!selectedChat.isGroupChat ? (
                  <>
                    <img
                      src={getSenderFull(user, selectedChat.users).avatar || "./public/Portrait_Placeholder.png"}
                      alt=""
                      className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm object-cover"
                    />
                    <div>
                      <h2 className="font-bold text-lg text-blue-900 leading-tight">
                        {getSender(user, selectedChat.users)}
                      </h2>
                    </div>
                  </>
                ) : (
                  <h2 className="font-bold text-lg text-blue-900 leading-tight">
                    {selectedChat.chatName.toUpperCase()}
                  </h2>
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="flex-1 overflow-y-auto p-4 bg-[#f0f4f8] relative"
            onClick={() => setShowEmojiPicker(false)}
          >
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
              </div>
            ) : (
              <>
                <ScrollableChat messages={messages} />
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Typing Indicator */}
            {isTyping ? (
              <div className="text-sm text-blue-500 italic mt-2 animate-pulse">
                Typing...
              </div>
            ) : (
              <></>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-blue-100 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-4 z-50 shadow-2xl rounded-xl overflow-hidden border border-blue-100">
                <EmojiPicker onEmojiClick={onEmojiClick} theme="light" />
              </div>
            )}

            {imageFile && (
              <div className="mb-3 relative inline-block">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="preview"
                  className="h-20 rounded-lg border border-blue-200"
                />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs shadow-md"
                >
                  X
                </button>
              </div>
            )}

            <form
              onSubmit={sendMessage}
              className="flex items-end gap-2 bg-blue-50 p-2 rounded-2xl border border-blue-100 transition-colors focus-within:border-blue-300 focus-within:bg-white"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 text-blue-500 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <Smile className="w-6 h-6" />
              </button>

              <label className="p-3 text-blue-500 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                <ImageIcon className="w-6 h-6" />
              </label>

              <input
                className="flex-1 bg-transparent border-none py-3 px-2 focus:outline-none text-blue-900 placeholder-blue-400"
                placeholder={
                  imageFile
                    ? "Image attached (Send to upload)"
                    : "Type a message..."
                }
                onChange={typingHandler}
                value={newMessage}
                disabled={imageFile !== null}
              />

              <button
                type="submit"
                disabled={(!newMessage.trim() && !imageFile) || loading}
                className="p-3 bg-blue-800 text-white hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Send className="w-6 h-6" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full bg-blue-50/30">
          <div className="text-center">
            <div className="inline-flex items-center justify-center max-h-[30rem] max-w-[30rem] mb-4">
              <img
                src="./public/LogoFull.png"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-blue-600 font-medium">
              Click on a user to start chatting
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SingleChat;
