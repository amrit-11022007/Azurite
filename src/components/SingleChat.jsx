import React, { useEffect, useState, useRef } from "react";
import { ChatState } from "../context/ChatProvider";
import { getSender, getSenderFull } from "../config/ChatLogics";
import axios from "axios";
import {
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
} from "lucide-react";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

const ENDPOINT = "https://azurite-backend.onrender.com";
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

  const { selectedChat, setSelectedChat, user, notifications, setNotifications } = ChatState();

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
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    });

    socket.on("chat read", ({ chatId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.chat?._id === chatId || m.chat === chatId) {
            return { ...m, status: "read" };
          }
          return m;
        })
      );
    });

    // Real-time delete
    socket.on("message deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    // Real-time edit
    socket.on("message edited", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      setLoading(true);
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);
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
        // Push to in-app notifications if not already there
        setNotifications((prev) => {
          if (prev.find((n) => n._id === newMessageRecieved._id)) return prev;
          return [newMessageRecieved, ...prev];
        });
        socket.emit("message delivered", newMessageRecieved._id);
        setFetchAgain(!fetchAgain);
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
        socket.emit("messages read", { chatId: selectedChatCompare._id, userId: user._id });
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
        headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` },
      };

      let type = "text";
      let content = newMessage;

      if (imageFile) {
        type = "image";
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadConfig = {
          headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "multipart/form-data" },
        };
        const uploadRes = await axios.post("/api/message/upload", formData, uploadConfig);
        content = uploadRes.data.url;
        setImageFile(null);
      } else {
        setNewMessage("");
      }

      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        content,
        chat: selectedChat,
        sender: user,
        type,
        status: "sending",
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(scrollToBottom, 10);

      const { data } = await axios.post(
        "/api/message",
        { content, chatId: selectedChat._id, type },
        config
      );

      socket.emit("new message", data);
      setMessages((prev) => prev.map((m) => (m._id === tempId ? data : m)));
      setFetchAgain(!fetchAgain);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((m) => (m.status === "sending" ? { ...m, status: "failed" } : m))
      );
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
    const timerLength = 3000;
    setTimeout(() => {
      const timeNow = new Date().getTime();
      if (timeNow - lastTypingTime >= timerLength && typing) {
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
          <div className="flex items-center p-3 px-4 bg-white border-b border-blue-100 shadow-sm justify-between min-h-[60px]">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden text-blue-800 hover:bg-blue-100 p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setSelectedChat("")}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {!selectedChat.isGroupChat ? (
                <>
                  <img
                    src={getSenderFull(user, selectedChat.users)?.avatar || "/Portrait_Placeholder.png"}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-blue-200 object-cover"
                  />
                  <div>
                    <h2 className="font-bold text-base text-blue-900 leading-tight">
                      {getSender(user, selectedChat.users)}
                    </h2>
                  </div>
                </>
              ) : (
                <h2 className="font-bold text-base text-blue-900">
                  {selectedChat.chatName.toUpperCase()}
                </h2>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="flex-1 overflow-y-auto p-3 bg-[#f0f4f8] relative"
            onClick={() => setShowEmojiPicker(false)}
          >
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800"></div>
              </div>
            ) : (
              <>
                <ScrollableChat messages={messages} setMessages={setMessages} socket={socket} />
                <div ref={messagesEndRef} />
              </>
            )}

            {isTyping && (
              <div className="text-xs text-blue-500 italic mt-1 animate-pulse px-2">Typing...</div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-blue-100 relative safe-area-pb">
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-2 z-50 shadow-2xl rounded-xl overflow-hidden border border-blue-100">
                <EmojiPicker onEmojiClick={onEmojiClick} theme="light" width={300} height={350} />
              </div>
            )}

            {imageFile && (
              <div className="mb-2 relative inline-block">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="preview"
                  className="h-16 rounded-lg border border-blue-200"
                />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md"
                >
                  <ArrowLeft className="w-3 h-3 rotate-45" />
                </button>
              </div>
            )}

            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-2xl border border-blue-100 focus-within:border-blue-300 focus-within:bg-white transition-colors"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-blue-500 hover:text-blue-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Smile className="w-5 h-5" />
              </button>

              <label className="p-2 text-blue-500 hover:text-blue-800 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                <ImageIcon className="w-5 h-5" />
              </label>

              <input
                className="flex-1 bg-transparent border-none py-2 focus:outline-none text-blue-900 placeholder-blue-400 text-base min-w-0"
                placeholder={imageFile ? "Image attached — tap Send" : "Message..."}
                onChange={typingHandler}
                value={newMessage}
                disabled={imageFile !== null}
              />

              <button
                type="submit"
                disabled={(!newMessage.trim() && !imageFile) || loading}
                className="p-2 bg-blue-800 text-white hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full bg-blue-50/30">
          <div className="text-center px-4">
            <div className="inline-flex items-center justify-center max-h-[28rem] max-w-[28rem] mb-4">
              <img src="/LogoFull.png" alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-blue-600 font-medium">Click on a user to start chatting</p>
          </div>
        </div>
      )}
    </>
  );
};

export default SingleChat;
