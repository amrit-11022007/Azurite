import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../context/ChatProvider";
import { ArrowLeft, Camera, User, Lock, Mail, Info } from "lucide-react";

const ProfilePage = () => {
  const { user, setUser } = ChatState();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [imageFile, setImageFile] = useState(null);

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' or 'security'

  useEffect(() => {
    if (user) {
      setName(user.name || user.userid);
      setEmail(user.email);
      setAbout(user.about || "");
      setAvatar(user.avatar);
    }
  }, [user]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image must be under 20MB." });
        return;
      }
      setImageFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

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

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      let avatarUrl = user.avatar;
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
      if (password) payload.password = password;

      const { data } = await axios.put("/api/users/profile", payload, config);

      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setMessage({ type: "success", text: "Settings updated successfully!" });
      setPassword(""); // Clear password field
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-blue-50 text-blue-950 p-4 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-start mb-6">
        <button
          onClick={() => navigate("/chats")}
          className="flex items-center text-blue-800 hover:text-blue-600 transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Chats
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-blue-100 flex flex-col md:flex-row">
        {/* Sidebar Settings Menu */}
        <div className="w-full md:w-1/3 bg-blue-800 text-white flex flex-col">
          <div className="p-8 text-center border-b border-blue-700/50">
            <div className="relative group flex justify-center items-center mb-4">
              <img
                src={avatar || "./public/Portrait_Placeholder.png"}
                className="w-24 h-24 rounded-full border-4 border-blue-600 object-cover shadow-lg"
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
          <div className="flex-1 py-4">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-8 py-4 flex items-center transition-colors ${activeTab === "profile" ? "bg-blue-900 border-l-4 border-blue-400" : "hover:bg-blue-700 border-l-4 border-transparent"}`}
            >
              <User className="w-5 h-5 mr-3" /> Profile Details
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full text-left px-8 py-4 flex items-center transition-colors ${activeTab === "security" ? "bg-blue-900 border-l-4 border-blue-400" : "hover:bg-blue-700 border-l-4 border-transparent"}`}
            >
              <Lock className="w-5 h-5 mr-3" /> Account Security
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full md:w-2/3 p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-blue-900 mb-8 border-b-2 border-blue-100 pb-4">
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

            {activeTab === "profile" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <label className="flex items-center text-sm font-semibold text-blue-800 mb-2">
                    <User className="w-4 h-4 mr-2" /> Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <p className="text-xs text-blue-500 mt-1">This name will be visible to other users in chats.</p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-blue-800 mb-2">
                    <Info className="w-4 h-4 mr-2" /> About Me
                  </label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    placeholder="Tell others about yourself..."
                  ></textarea>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <label className="flex items-center text-sm font-semibold text-blue-800 mb-2">
                    <Mail className="w-4 h-4 mr-2" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-blue-800 mb-2">
                    <Lock className="w-4 h-4 mr-2" /> New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-blue-100 mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
