import React, { useState, useRef, useCallback } from "react";
import { ChatState } from "../context/ChatProvider";
import { format } from "date-fns";
import { Circle, CheckCircle2, AlertCircle, Trash2, Pencil, X } from "lucide-react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// ScrollableChat Component
//
// This component renders the individual message bubbles in a conversation list.
// Key features:
//   • Standard one-to-one and group chat layouts.
//   • Dynamic message status icons (sending, sent, delivered, read, failed).
//   • Mobile long-press and desktop right-click support to open a custom context menu
//     for message editing and hard deletion ("Delete for everyone").
//   • Dynamic dark and light message bubble styles using CSS variables.
//   • Renders text and image uploads.
//   • Shows *(edited)* tags for modified messages.
// ─────────────────────────────────────────────────────────────────────────────
const ScrollableChat = ({ messages, setMessages, socket }) => {
  const { user } = ChatState();
  const [contextMenu, setContextMenu] = useState(null); // Custom dropdown: { message, x, y }
  const [editingMessage, setEditingMessage] = useState(null); // Message currently being edited: { _id, content }
  const [editContent, setEditContent] = useState("");         // Inline edit input content
  const longPressTimer = useRef(null);                        // Timer reference for mobile long press

  // Helper: Checks if the next message is from a different sender, to control avatar rendering
  const isSameSender = (messages, m, i, userId) => {
    return (
      i < messages.length - 1 &&
      (messages[i + 1].sender._id !== m.sender._id || messages[i + 1].sender._id === undefined) &&
      messages[i].sender._id !== userId
    );
  };

  // Helper: Checks if the current message is the absolute last in the sequence from a recipient
  const isLastMessage = (messages, i, userId) => {
    return (
      i === messages.length - 1 &&
      messages[messages.length - 1].sender._id !== userId &&
      messages[messages.length - 1].sender._id
    );
  };

  // ─── Status Icon Builder ──────────────────────────────────────────────────
  const getStatusIcon = (status) => {
    switch (status) {
      case "sending": return <Circle className="w-3 h-3 text-blue-300 animate-pulse" />;
      case "sent": return <CheckCircle2 className="w-3 h-3 text-white/50" />;
      case "delivered": return <CheckCircle2 className="w-3 h-3 text-white/80" />;
      case "read": return <CheckCircle2 className="w-3 h-3 text-blue-300" />;
      case "failed": return <AlertCircle className="w-3 h-3 text-red-500 animate-bounce" />;
      default: return <CheckCircle2 className="w-3 h-3 text-white/50" />;
    }
  };

  // ─── Context Menu controls ────────────────────────────────────────────────
  const openContextMenu = useCallback((e, message) => {
    // Only allow operations on your own messages
    if (message.sender._id !== user._id) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 100;
    let x = e.clientX || rect.left + rect.width / 2;
    let y = e.clientY || rect.top;

    // Prevent dropdown from extending beyond browser viewport limits
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
    if (y - menuHeight < 0) y = menuHeight + 8;

    setContextMenu({ message, x, y });
  }, [user._id]);

  // Mobile long-press handler
  const handleTouchStart = useCallback((e, message) => {
    if (message.sender._id !== user._id) return;
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      const fakeEvent = {
        preventDefault: () => {},
        clientX: touch.clientX,
        clientY: touch.clientY,
        currentTarget: e.currentTarget,
      };
      openContextMenu(fakeEvent, message);
    }, 500); // 500ms tap-and-hold delay
  }, [openContextMenu, user._id]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  // ─── Message Deletion (Delete for Everyone) ──────────────────────────────
  const handleDelete = async (message) => {
    setContextMenu(null);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.delete(`/api/message/${message._id}`, config);
      
      // Update local state list
      setMessages((prev) => prev.filter((m) => m._id !== message._id));
      // Broadcast deletion to all other connected socket clients
      socket?.emit("message deleted", { messageId: data.messageId, chatId: data.chatId });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ─── Message Editing ──────────────────────────────────────────────────────
  const handleEditSubmit = async () => {
    if (!editContent.trim() || editContent === editingMessage.content) {
      setEditingMessage(null);
      return;
    }
    try {
      const config = {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` },
      };
      const { data } = await axios.put(
        `/api/message/${editingMessage._id}`,
        { content: editContent },
        config
      );
      // Update local message state
      setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
      // Broadcast modification to other sockets
      socket?.emit("message edited", data);
      setEditingMessage(null);
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  const startEdit = (message) => {
    setContextMenu(null);
    setEditingMessage(message);
    setEditContent(message.content);
  };

  return (
    <div className="flex flex-col space-y-2 pb-4" onClick={() => setContextMenu(null)}>
      {/* ── Context Menu Overlay dropdown ── */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl shadow-2xl border overflow-hidden"
          style={{
            top: contextMenu.y - 90,
            left: contextMenu.x,
            minWidth: 160,
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-color)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.message.type === "text" && (
            <button
              onClick={() => startEdit(contextMenu.message)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-85 transition-colors text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              <Pencil className="w-4 h-4 text-blue-500" /> Edit Message
            </button>
          )}
          <button
            onClick={() => handleDelete(contextMenu.message)}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-bold"
          >
            <Trash2 className="w-4 h-4" /> Delete for Everyone
          </button>
        </div>
      )}

      {/* ── Inline Message Edit Bar ── */}
      {editingMessage && (
        <div
          className="sticky top-0 z-40 border rounded-xl mx-2 p-3 shadow-md flex gap-2 items-center"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
          }}
        >
          <Pencil className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <input
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSubmit();
              if (e.key === "Escape") setEditingMessage(null);
            }}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            placeholder="Edit message..."
            style={{ color: "var(--text-primary)" }}
          />
          <button onClick={handleEditSubmit} className="text-blue-500 hover:opacity-80 font-bold text-sm px-2">Save</button>
          <button onClick={() => setEditingMessage(null)} className="text-blue-400 hover:text-blue-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Message Bubble List ── */}
      {messages &&
        messages.map((m, i) => {
          const isMyMessage = m.sender._id === user._id;
          const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);

          return (
            <div
              key={m._id}
              className={`flex items-end ${isMyMessage ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar picture for group member messages */}
              {showAvatar && !isMyMessage && (
                <img
                  src={m.sender.avatar || "/Portrait_Placeholder.png"}
                  alt={m.sender.name || m.sender.userid}
                  className="w-7 h-7 rounded-full mr-1.5 object-cover flex-shrink-0"
                  title={m.sender.name || m.sender.userid}
                />
              )}
              
              <div
                className={`relative px-3 py-2 max-w-[78%] sm:max-w-[70%] shadow-sm flex flex-col select-none ${
                  isMyMessage
                    ? "rounded-2xl rounded-br-sm"
                    : "border rounded-2xl rounded-bl-sm"
                } ${!isMyMessage && !showAvatar ? "ml-8" : ""}`}
                style={{
                  backgroundColor: isMyMessage ? "var(--bubble-mine)" : "var(--bubble-theirs)",
                  color: isMyMessage ? "var(--bubble-mine-text)" : "var(--bubble-theirs-text)",
                  borderColor: isMyMessage ? "transparent" : "var(--border-color)",
                }}
                onContextMenu={(e) => openContextMenu(e, m)}
                onTouchStart={(e) => handleTouchStart(e, m)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                {/* Display name of other members inside group chats */}
                {!isMyMessage && (showAvatar || i === 0 || messages[i - 1].sender._id !== m.sender._id) && (
                  <span className="text-[11px] font-bold mb-0.5" style={{ color: "var(--text-secondary)" }}>
                    {m.sender.name || m.sender.userid}
                  </span>
                )}

                {/* Body: text message or image rendering */}
                {m.type === "text" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{m.content}</p>
                ) : (
                  <img
                    src={m.content}
                    alt="Shared Media"
                    className="rounded-lg max-w-full max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity mt-1"
                    onClick={() => window.open(m.content, "_blank")}
                  />
                )}

                {/* Footer details: time, isEdited flag, message checklist icon */}
                <div
                  className="flex items-center justify-end gap-1 text-[10px] mt-0.5"
                  style={{
                    color: isMyMessage ? "rgba(255, 255, 255, 0.75)" : "var(--text-secondary)",
                  }}
                >
                  {m.isEdited && <span className="italic">(edited)</span>}
                  <span>{format(new Date(m.createdAt || Date.now()), "hh:mm a")}</span>
                  {isMyMessage && getStatusIcon(m.status)}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ScrollableChat;
