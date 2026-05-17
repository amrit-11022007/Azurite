import React, { useState, useRef, useCallback } from "react";
import { ChatState } from "../context/ChatProvider";
import { format } from "date-fns";
import { Circle, CheckCircle2, AlertCircle, Trash2, Pencil, X } from "lucide-react";
import axios from "axios";

const ScrollableChat = ({ messages, setMessages, socket }) => {
  const { user } = ChatState();
  const [contextMenu, setContextMenu] = useState(null); // { messageId, x, y }
  const [editingMessage, setEditingMessage] = useState(null); // { _id, content }
  const [editContent, setEditContent] = useState("");
  const longPressTimer = useRef(null);

  const isSameSender = (messages, m, i, userId) => {
    return (
      i < messages.length - 1 &&
      (messages[i + 1].sender._id !== m.sender._id || messages[i + 1].sender._id === undefined) &&
      messages[i].sender._id !== userId
    );
  };

  const isLastMessage = (messages, i, userId) => {
    return (
      i === messages.length - 1 &&
      messages[messages.length - 1].sender._id !== userId &&
      messages[messages.length - 1].sender._id
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sending": return <Circle className="w-3 h-3 text-gray-400 animate-pulse" />;
      case "sent": return <CheckCircle2 className="w-3 h-3 text-black" />;
      case "delivered": return <CheckCircle2 className="w-3 h-3 text-gray-500" />;
      case "read": return <CheckCircle2 className="w-3 h-3 text-blue-400" />;
      case "failed": return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return <CheckCircle2 className="w-3 h-3 text-black" />;
    }
  };

  const openContextMenu = useCallback((e, message) => {
    if (message.sender._id !== user._id) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 100;
    let x = e.clientX || rect.left + rect.width / 2;
    let y = e.clientY || rect.top;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
    if (y - menuHeight < 0) y = menuHeight + 8;
    setContextMenu({ message, x, y });
  }, [user._id]);

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
    }, 500);
  }, [openContextMenu, user._id]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleDelete = async (message) => {
    setContextMenu(null);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.delete(`/api/message/${message._id}`, config);
      setMessages((prev) => prev.filter((m) => m._id !== message._id));
      socket?.emit("message deleted", { messageId: data.messageId, chatId: data.chatId });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

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
      setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
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
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-blue-100 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: contextMenu.y - 90, left: contextMenu.x, minWidth: 160 }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.message.type === "text" && (
            <button
              onClick={() => startEdit(contextMenu.message)}
              className="w-full flex items-center gap-3 px-4 py-3 text-blue-800 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
          <button
            onClick={() => handleDelete(contextMenu.message)}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" /> Delete for everyone
          </button>
        </div>
      )}

      {/* Edit input bar */}
      {editingMessage && (
        <div className="sticky top-0 z-40 bg-blue-50 border border-blue-200 rounded-xl mx-2 p-3 shadow-md flex gap-2 items-center">
          <Pencil className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <input
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSubmit();
              if (e.key === "Escape") setEditingMessage(null);
            }}
            className="flex-1 bg-transparent text-blue-900 text-sm focus:outline-none"
            placeholder="Edit message..."
          />
          <button onClick={handleEditSubmit} className="text-blue-700 hover:text-blue-900 font-bold text-sm px-2">Save</button>
          <button onClick={() => setEditingMessage(null)} className="text-blue-400 hover:text-blue-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {messages &&
        messages.map((m, i) => {
          const isMyMessage = m.sender._id === user._id;
          const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);

          return (
            <div
              key={m._id}
              className={`flex items-end ${isMyMessage ? "justify-end" : "justify-start"}`}
            >
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
                    ? "bg-blue-800 text-white rounded-2xl rounded-br-sm"
                    : "bg-white text-blue-900 border border-blue-100 rounded-2xl rounded-bl-sm"
                } ${!isMyMessage && !showAvatar ? "ml-8" : ""}`}
                onContextMenu={(e) => openContextMenu(e, m)}
                onTouchStart={(e) => handleTouchStart(e, m)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                {!isMyMessage && (showAvatar || i === 0 || messages[i - 1].sender._id !== m.sender._id) && (
                  <span className="text-[11px] font-bold text-blue-500 mb-0.5">
                    {m.sender.name || m.sender.userid}
                  </span>
                )}
                {m.type === "text" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{m.content}</p>
                ) : (
                  <img
                    src={m.content}
                    alt="Shared"
                    className="rounded-lg max-w-full max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity mt-1"
                    onClick={() => window.open(m.content, "_blank")}
                  />
                )}
                <div className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${isMyMessage ? "text-blue-200" : "text-blue-400"}`}>
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
