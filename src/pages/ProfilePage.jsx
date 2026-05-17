import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../context/ChatProvider";
import { ArrowLeft, Camera, User, Lock, Mail, Info, AlertTriangle, Trash2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage Component
//
// This page allows the user to:
//   1. View and edit display name, profile avatar (uploaded to Cloudinary),
//      and about description.
//   2. Manage account security: update email, password.
//   3. Delete Account (Danger Zone): permanently and irreversibly erase
//      all messages, chats, and user data after typing confirmation phrase.
// ─────────────────────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, setUser } = ChatState();
  const navigate = useNavigate();

  // ─── Input States ─────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [imageFile, setImageFile] = useState(null);

  // Tab management: 'profile' or 'security'
  const [activeTab, setActiveTab] = useState("profile");

  // Account deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load current user details into states on mount / user change
  useEffect(() => {
    if (user) {
      setName(user.name || user.userid);
      setEmail(user.email);
      setAbout(user.about || "");
      setAvatar(user.avatar);
    }
  }, [user]);

  // ─── Image file selection & local preview ──────────────────────────────────
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image must be under 20MB." });
        return;
      }
      setImageFile(file);
      setAvatar(URL.createObjectURL(file)); // Direct local object URL preview
    }
  };

  // ─── Stream avatar to Cloudinary ──────────────────────────────────────────
  const uploadImage = async () => {
    const data = new FormData();
    data.append("image", imageFile);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      };
      const res = await axios.post("/api/users/upload-avatar", data, config);
      return res.data.url;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to upload image");
    }
  };

  // ─── Form submit: Save updates ────────────────────────────────────────────
  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      let avatarUrl = user.avatar;
      // If a new local image was chosen, upload to Cloudinary first
      if (imageFile) {
        avatarUrl = await uploadImage();
      }

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const payload = { name, email, about, avatar: avatarUrl };
      if (password) payload.password = password; // Only send password if updated

      const { data } = await axios.put("/api/users/profile", payload, config);

      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setMessage({ type: "success", text: "Settings updated successfully!" });
      setPassword(""); // Reset password input
      setImageFile(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
    setLoading(false);
  };

  // ─── Delete Account: backend call ─────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      alert("Please type DELETE to confirm account removal.");
      return;
    }
    try {
      setDeleteLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.delete("/api/users/account", config);
      
      // Clear session local data & context
      localStorage.removeItem("userInfo");
      setUser(null);
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
      
      // Send back to LoginPage
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
      setDeleteLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full p-4 md:p-10 flex flex-col items-center transition-colors"
      style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
    >
      {/* Back button */}
      <div className="w-full max-w-4xl flex justify-start mb-6">
        <button
          onClick={() => navigate("/chats")}
          className="flex items-center text-blue-600 hover:opacity-80 transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Chats
        </button>
      </div>

      {/* Main card */}
      <div
        className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border flex flex-col md:flex-row"
        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)" }}
      >
        {/* Profile Sidebar */}
        <div className="w-full md:w-1/3 bg-blue-700 text-white flex flex-col">
          <div className="p-8 text-center border-b border-blue-600">
            <div className="relative group flex justify-center items-center mb-4">
              <img
                src={avatar || "/Portrait_Placeholder.png"}
                className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover shadow-lg"
                alt="Profile"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <h2 className="text-xl font-bold truncate">{name}</h2>
            <p className="text-blue-200 text-sm truncate">@{user?.userid}</p>
          </div>

          <div className="flex-1 py-4 bg-blue-800">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-8 py-4 flex items-center transition-colors ${activeTab === "profile" ? "bg-blue-900 border-l-4 border-blue-300" : "hover:bg-blue-700 border-l-4 border-transparent"}`}
            >
              <User className="w-5 h-5 mr-3" /> Profile Details
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full text-left px-8 py-4 flex items-center transition-colors ${activeTab === "security" ? "bg-blue-900 border-l-4 border-blue-300" : "hover:bg-blue-700 border-l-4 border-transparent"}`}
            >
              <Lock className="w-5 h-5 mr-3" /> Account Security
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div className="w-full md:w-2/3 p-8 md:p-12">
          <h1 className="text-3xl font-extrabold mb-8 border-b pb-4" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
            {activeTab === "profile" ? "Profile Details" : "Account Security"}
          </h1>

          <form onSubmit={submitHandler} className="space-y-6">
            {message.text && (
              <div
                className={`p-4 rounded-xl text-center font-medium ${message.type === "error" ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"}`}
              >
                {message.text}
              </div>
            )}

            {/* TAB: PROFILE DETAILS */}
            {activeTab === "profile" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <label className="flex items-center text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    <User className="w-4 h-4 mr-2" /> Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                    style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    This name will be visible to other users in chats.
                  </p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    <Info className="w-4 h-4 mr-2" /> About Me
                  </label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 text-base resize-none"
                    placeholder="Tell others about yourself..."
                    style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  ></textarea>
                </div>
              </div>
            )}

            {/* TAB: SECURITY & DANGER ZONE */}
            {activeTab === "security" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <label className="flex items-center text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    <Mail className="w-4 h-4 mr-2" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                    style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    <Lock className="w-4 h-4 mr-2" /> New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                    style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                {/* Danger Zone Account Deletion section */}
                <div className="pt-6 border-t" style={{ borderColor: "var(--border-color)" }}>
                  <div className="rounded-2xl p-5 border border-red-200 bg-red-500/5">
                    <h3 className="text-red-500 font-bold text-lg flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                      Deleting your account will permanently wipe out all chats, files, and push notification configurations. This operation is irreversible.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow"
                    >
                      <Trash2 className="w-4 h-4" /> Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save bar */}
            <div className="pt-6 border-t mt-8" style={{ borderColor: "var(--border-color)" }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Delete Account Confirmation Modal ─────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur background overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          
          <div
            className="relative dm-bg-primary rounded-3xl p-6 shadow-2xl max-w-sm w-full border"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-red-600 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6" /> Irreversible Action
            </h2>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              All message histories and user relationships will be instantly and permanently removed. To confirm deletion, please type <strong className="text-red-500 font-bold">DELETE</strong> in the box below:
            </p>
            <input
              type="text"
              placeholder="Type 'DELETE'"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-base mb-4 font-bold tracking-widest text-center"
              style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "var(--border-color)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold shadow disabled:opacity-40 transition-opacity"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
