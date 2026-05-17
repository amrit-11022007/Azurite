import React, { useEffect, useState, useRef } from "react";
import { ChatState } from "../context/ChatProvider";
import { getSender, getSenderFull } from "../config/ChatLogics";
import axios from "axios";
import { ArrowLeft, Send, Smile, Image as ImageIcon, ChevronDown } from "lucide-react";
import ScrollableChat from "./ScrollableChat";
import GroupInfoModal from "./GroupInfoModal";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

// ─── Socket.io connection endpoint ───────────────────────────────────────────
// Points to the deployed Render backend. Change this if self-hosting.
const ENDPOINT = "https://azurite-backend.onrender.com";

// These live outside the component so they survive re-renders.
// socket: the socket.io connection instance
// selectedChatCompare: used to detect if an incoming message is for the active chat
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);          // All messages in the current chat
  const [loading, setLoading] = useState(false);         // Loading spinner while fetching messages
  const [newMessage, setNewMessage] = useState("");       // Text in the input box
  const [socketConnected, setSocketConnected] = useState(false); // Is socket live?
  const [typing, setTyping] = useState(false);           // Are WE typing?
  const [isTyping, setIsTyping] = useState(false);       // Is the OTHER person typing?
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageFile, setImageFile] = useState(null);      // Image selected for upload
  const [showGroupInfo, setShowGroupInfo] = useState(false); // Toggle GroupInfoModal
  const [activeChat, setActiveChat] = useState(null);    // Local copy of chat (can be updated by GroupInfoModal)

  const messagesEndRef = useRef(null);

  const { selectedChat, setSelectedChat, user, notifications, setNotifications } = ChatState();

  // Keep a local copy of the chat so GroupInfoModal updates (name/avatar/members)
  // are reflected in the header without having to refetch all chats
  useEffect(() => {
    setActiveChat(selectedChat);
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Android Back Button Handler ─────────────────────────────────────────
  // On mobile browsers, pressing the physical back button fires a "popstate"
  // event. We intercept it here: if a chat is open, we close it (go to inbox)
  // instead of letting the browser navigate backwards (which would close the app
  // or go to the previous page).
  useEffect(() => {
    const handlePopState = () => {
      if (selectedChatCompare) {
        // A chat is open — close it and go back to the chat list
        setSelectedChat(null);
        // Push a new history entry so the back button works again next time
        window.history.pushState(null, "", window.location.href);
      }
    };

    // Push a dummy history entry so the back button triggers popstate
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // ─── Socket Setup ────────────────────────────────────────────────────────
  // Runs once on mount. Connects to the socket server, joins the user's
  // personal room (their userId), and sets up all real-time event listeners.
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    // Delivery/read status update from server
    socket.on("message status update", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    });

    // When the other person opens the chat, all our messages become 'read'
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

    // Real-time delete: remove the message from the local list
    socket.on("message deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    // Real-time edit: replace the old message with the updated one
    socket.on("message edited", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ─── Fetch Messages for Selected Chat ────────────────────────────────────
  // Every time the user clicks a different chat, we fetch its message history
  // and join the socket room for that chat so we receive real-time updates.
  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      setLoading(true);
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);
      setMessages(data);
      setLoading(false);

      // Join this chat's socket room
      socket.emit("join chat", selectedChat._id);
      // Mark all messages as read since we're now viewing this chat
      socket.emit("messages read", { chatId: selectedChat._id, userId: user._id });
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Keep a reference to the active chat for the incoming message handler
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  // ─── Real-time Incoming Message Handler ──────────────────────────────────
  // When a new message arrives via socket, check if it's for the currently
  // open chat. If yes, add it to the list. If no (different chat), add it
  // to in-app notifications and emit 'delivered' so the sender sees ✓.
  useEffect(() => {
    const handleNewMessage = (newMessageRecieved) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        // Message is for a different chat — add to notification bell
        setNotifications((prev) => {
          if (prev.find((n) => n._id === newMessageRecieved._id)) return prev;
          return [newMessageRecieved, ...prev];
        });
        socket.emit("message delivered", newMessageRecieved._id);
        setFetchAgain(!fetchAgain);
      } else {
        // Message is for the current chat — append it
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

  // ─── Send Message ─────────────────────────────────────────────────────────
  // Handles both text and image messages.
  // For images: first uploads to Cloudinary via /api/message/upload,
  // then sends the returned URL as the message content with type='image'.
  // Uses optimistic UI — adds a temporary 'sending' message immediately
  // so the user sees instant feedback, then replaces it with the real one.
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

      // Optimistic UI: add a fake 'sending' message while waiting for server response
      const tempId = Date.now().toString();
      const optimisticMessage = { _id: tempId, content, chat: selectedChat, sender: user, type, status: "sending" };
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(scrollToBottom, 10);

      const { data } = await axios.post("/api/message", { content, chatId: selectedChat._id, type }, config);

      // Replace the temporary message with the real one from the server
      socket.emit("new message", data);
      setMessages((prev) => prev.map((m) => (m._id === tempId ? data : m)));
      setFetchAgain(!fetchAgain);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error(error);
      // Mark any 'sending' messages as failed if there's an error
      setMessages((prev) =>
        prev.map((m) => (m.status === "sending" ? { ...m, status: "failed" } : m))
      );
    }
  };

  // ─── Typing Indicator ────────────────────────────────────────────────────
  // Emits 'typing' and 'stop typing' socket events so the other person sees
  // "Typing..." in their chat. Uses a 3-second debounce timer.
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
      if (new Date().getTime() - lastTypingTime >= timerLength && typing) {
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
      if (file.size > 5 * 1024 * 1024) { alert("File must be smaller than 5MB"); return; }
      setImageFile(file);
    }
  };

  // ─── GroupInfoModal callback ─────────────────────────────────────────────
  // Called when the admin saves group changes (name/avatar/members).
  // Updates the local activeChat so the header re-renders immediately.
  const handleChatUpdate = (updatedChat) => {
    setActiveChat(updatedChat);
  };

  return (
    <>
      {activeChat ? (
        <div className="flex flex-col h-full w-full" style={{ background: "var(--bg-primary)" }}>

          {/* ── Chat Header ──────────────────────────────────────────────── */}
          <div
            className="flex items-center p-3 px-4 border-b justify-between min-h-[60px]"
            style={{ background: "var(--header-bg)", borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center gap-3">
              {/* Back button — visible on mobile only */}
              <button
                className="md:hidden text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setSelectedChat(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {!activeChat.isGroupChat ? (
                // ── 1-on-1 chat header: show the other person's avatar and name ──
                <>
                  <img
                    src={getSenderFull(user, activeChat.users)?.avatar || "/Portrait_Placeholder.png"}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-blue-200 object-cover"
                  />
                  <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    {getSender(user, activeChat.users)}
                  </h2>
                </>
              ) : (
                // ── Group chat header: avatar + clickable name that opens GroupInfoModal ──
                <>
                  <img
                    src={activeChat.groupAvatar || "/Portrait_Placeholder.png"}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-blue-200 object-cover"
                  />
                  {/* Clicking the group name opens the GroupInfoModal */}
                  <button
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    onClick={() => setShowGroupInfo(true)}
                  >
                    <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                      {activeChat.chatName}
                    </h2>
                    {/* Small chevron hints that it's tappable */}
                    <ChevronDown className="w-4 h-4 text-blue-400" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Messages Area ─────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto p-3 relative"
            style={{ background: "var(--bg-chat)" }}
            onClick={() => setShowEmojiPicker(false)}
          >
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <ScrollableChat messages={messages} setMessages={setMessages} socket={socket} />
                {/* Invisible div at the bottom — we scroll to this when new messages arrive */}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Typing indicator: shows when the other person is typing */}
            {isTyping && (
              <div className="text-xs italic animate-pulse px-2 mt-1" style={{ color: "var(--text-secondary)" }}>
                Typing...
              </div>
            )}
          </div>

          {/* ── Input Area ────────────────────────────────────────────────── */}
          <div
            className="p-3 border-t relative safe-area-pb"
            style={{ background: "var(--header-bg)", borderColor: "var(--border-color)" }}
          >
            {/* Emoji Picker (floats above the input) */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-2 z-50 shadow-2xl rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-color)" }}>
                <EmojiPicker onEmojiClick={onEmojiClick} theme="light" width={300} height={350} />
              </div>
            )}

            {/* Image preview before sending */}
            {imageFile && (
              <div className="mb-2 relative inline-block">
                <img src={URL.createObjectURL(imageFile)} alt="preview" className="h-16 rounded-lg border border-blue-200" />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                >✕</button>
              </div>
            )}

            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border focus-within:border-blue-400 transition-colors"
              style={{ background: "var(--input-bg)", borderColor: "var(--border-color)" }}
            >
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-blue-500 hover:text-blue-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Image attach button */}
              <label className="p-2 text-blue-500 hover:text-blue-800 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                <ImageIcon className="w-5 h-5" />
              </label>

              {/* Text input */}
              <input
                className="flex-1 bg-transparent border-none py-2 focus:outline-none text-base min-w-0"
                style={{ color: "var(--text-primary)" }}
                placeholder={imageFile ? "Image attached — tap Send" : "Message..."}
                onChange={typingHandler}
                value={newMessage}
                disabled={imageFile !== null}
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={(!newMessage.trim() && !imageFile) || loading}
                className="p-2 bg-blue-700 text-white hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-40 shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        // ── Empty state: no chat selected ─────────────────────────────────
        <div className="flex items-center justify-center h-full w-full" style={{ background: "var(--bg-secondary)" }}>
          <div className="text-center px-4">
            <div className="inline-flex items-center justify-center max-h-[28rem] max-w-[28rem] mb-4">
              <img src="/LogoFull.png" alt="" className="w-full h-full object-cover" />
            </div>
            <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
              Click on a user to start chatting
            </p>
          </div>
        </div>
      )}

      {/* ── Group Info Modal ─────────────────────────────────────────────── */}
      {/* Rendered outside the main div so it can overlay everything */}
      {showGroupInfo && activeChat && (
        <GroupInfoModal
          chat={activeChat}
          onClose={() => setShowGroupInfo(false)}
          onChatUpdate={handleChatUpdate}
        />
      )}
    </>
  );
};

export default SingleChat;
