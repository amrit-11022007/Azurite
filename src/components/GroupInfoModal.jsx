import React, { useState, useRef } from "react";
import axios from "axios";
import { ChatState } from "../context/ChatProvider";
import { X, Camera, UserPlus, Trash2, Crown, Search, LogOut } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// GroupInfoModal Component
// 
// Props:
//   chat        — the full group chat object (includes users, groupAdmin, groupAvatar)
//   onClose     — function to call when the modal is dismissed
//   onChatUpdate — function called with the updated chat after any change,
//                  so the parent (SingleChat) can update its state
//
// Features:
//   • Shows group avatar (editable by admin)
//   • Shows group name (editable by admin)
//   • Lists all members with crown icon for admin
//   • Admin can remove any member (except themselves)
//   • Admin can search and add new members
//   • Non-admin members see a "Leave Group" button
// ─────────────────────────────────────────────────────────────────────────────
const GroupInfoModal = ({ chat, onClose, onChatUpdate }) => {
  const { user, setSelectedChat } = ChatState();

  // ─── Local state ──────────────────────────────────────────────────────────
  const [groupName, setGroupName] = useState(chat.chatName);       // Editable group name
  const [groupAvatar, setGroupAvatar] = useState(chat.groupAvatar); // Currently displayed avatar URL
  const [avatarFile, setAvatarFile] = useState(null);              // Pending file upload
  const [addSearch, setAddSearch] = useState("");                   // Search query for adding members
  const [searchResults, setSearchResults] = useState([]);           // Users found by search
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Current members from the chat prop (we refresh via onChatUpdate)
  const [members, setMembers] = useState(chat.users);

  const isAdmin = chat.groupAdmin?._id === user._id || chat.groupAdmin === user._id;

  // ─── Handle group avatar file selection (preview before upload) ───────────
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Image must be under 20MB");
      return;
    }
    setAvatarFile(file);
    // Show local preview immediately so the user sees the change before saving
    setGroupAvatar(URL.createObjectURL(file));
  };

  // ─── Save group name and/or avatar changes ────────────────────────────────
  // Sends a PUT request to /api/chat/group/:chatId with multipart/form-data
  // so the image can be streamed to Cloudinary on the backend.
  const handleSaveInfo = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("chatId", chat._id);
      if (groupName !== chat.chatName) formData.append("chatName", groupName);
      if (avatarFile) formData.append("groupAvatar", avatarFile);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      };
      const { data } = await axios.put(`/api/chat/group/${chat._id}`, formData, config);
      setMessage("Group updated!");
      setAvatarFile(null);
      onChatUpdate(data); // Tell parent to refresh the chat object
    } catch (err) {
      setMessage(err.response?.data?.message || "Update failed");
    }
    setLoading(false);
  };

  // ─── Search for users to add ──────────────────────────────────────────────
  const handleSearch = async (query) => {
    setAddSearch(query);
    if (!query) { setSearchResults([]); return; }
    try {
      const { data } = await axios.get(`/api/users?search=${query}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // Filter out users who are already in the group
      const filtered = data.filter((u) => !members.find((m) => m._id === u._id));
      setSearchResults(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Add a user to the group ──────────────────────────────────────────────
  // Calls PUT /api/chat/groupadd with the chatId and the target userId.
  // On success, the updated chat (with new members list) is returned.
  const handleAdd = async (targetUser) => {
    try {
      const { data } = await axios.put(
        "/api/chat/groupadd",
        { chatId: chat._id, userId: targetUser._id },
        { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } }
      );
      setMembers(data.users); // Refresh the local member list
      setSearchResults([]);
      setAddSearch("");
      onChatUpdate(data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add user");
    }
  };

  // ─── Remove a member from the group ──────────────────────────────────────
  // Admin can remove anyone. This calls PUT /api/chat/groupremove.
  // If the removed person is the currently logged-in user, we close the modal
  // and clear the selected chat (since they left).
  const handleRemove = async (targetUserId) => {
    try {
      const { data } = await axios.put(
        "/api/chat/groupremove",
        { chatId: chat._id, userId: targetUserId },
        { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } }
      );
      setMembers(data.users);
      onChatUpdate(data);

      // If the current user removed themselves (left the group), close everything
      if (targetUserId === user._id) {
        setSelectedChat(null);
        onClose();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to remove user");
    }
  };

  return (
    // ─── Backdrop ─────────────────────────────────────────────────────────
    // Clicking the dark overlay behind the modal closes it
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Dark blurred backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* ─── Modal Panel ──────────────────────────────────────────────────── */}
      {/* Stops click from bubbling up to the backdrop */}
      <div
        className="relative dm-bg-primary rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl"
        style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h2 className="font-bold text-lg">Group Info</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-blue-50 transition-colors">
            <X className="w-5 h-5 text-blue-400" />
          </button>
        </div>

        {/* ─── Scrollable Content ─────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Group Avatar ── */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              {/* Shows the group avatar or a default placeholder */}
              <img
                src={groupAvatar || "/Portrait_Placeholder.png"}
                alt="Group"
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 shadow"
              />
              {/* Admin-only: tap to change avatar */}
              {isAdmin && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                </label>
              )}
            </div>

            {/* ── Group Name (editable by admin) ── */}
            {isAdmin ? (
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-center font-bold text-xl border-b-2 border-blue-300 focus:outline-none focus:border-blue-600 bg-transparent w-full max-w-xs"
                style={{ color: "var(--text-primary)" }}
              />
            ) : (
              <h3 className="font-bold text-xl">{groupName}</h3>
            )}
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {members.length} members
            </span>
          </div>

          {/* ── Save Button (admin only, visible if there are pending changes) ── */}
          {isAdmin && (
            <button
              onClick={handleSaveInfo}
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? "Saving..." : "Save Group Info"}
            </button>
          )}

          {/* Feedback message */}
          {message && (
            <p className="text-center text-sm font-medium text-blue-600">{message}</p>
          )}

          {/* ── Add Member Search (admin only) ────────────────────────────── */}
          {isAdmin && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: "var(--text-secondary)" }}>
                Add Member
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input
                    value={addSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                    style={{ background: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div
                  className="mt-1 rounded-xl border overflow-hidden"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-primary)" }}
                >
                  {searchResults.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => handleAdd(u)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors"
                    >
                      <img src={u.avatar || "/Portrait_Placeholder.png"} className="w-8 h-8 rounded-full object-cover" alt="" />
                      <div className="text-left">
                        <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{u.name || u.userid}</div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>@{u.userid}</div>
                      </div>
                      <UserPlus className="ml-auto w-4 h-4 text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Members List ─────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: "var(--text-secondary)" }}>
              Members
            </label>
            <div className="space-y-1">
              {members.map((member) => {
                const memberIsAdmin =
                  chat.groupAdmin?._id === member._id || chat.groupAdmin === member._id;
                const isSelf = member._id === user._id;

                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    <img
                      src={member.avatar || "/Portrait_Placeholder.png"}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-1.5 truncate" style={{ color: "var(--text-primary)" }}>
                        {member.name || member.userid}
                        {/* Gold crown icon for admin */}
                        {memberIsAdmin && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                        {isSelf && <span className="text-xs text-blue-400">(you)</span>}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>@{member.userid}</div>
                    </div>

                    {/* Admin can remove others; anyone can leave (remove themselves) */}
                    {(isAdmin && !isSelf) && (
                      <button
                        onClick={() => handleRemove(member._id)}
                        className="p-1.5 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                        title="Remove from group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Leave Group Button (non-admin members) ───────────────────────── */}
        {!isAdmin && (
          <div className="p-5 border-t" style={{ borderColor: "var(--border-color)" }}>
            <button
              onClick={() => handleRemove(user._id)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" /> Leave Group
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupInfoModal;
