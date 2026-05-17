import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../context/ChatProvider";

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userid, setUserid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { setUser } = ChatState();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password || (!isLogin && (!userid || !name))) {
      setError("Please fill all fields.");
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: { "Content-type": "application/json" },
      };

      let data;
      if (isLogin) {
        const res = await axios.post(
          "/api/users/login",
          { email, password },
          config,
        );
        data = res.data;
      } else {
        const res = await axios.post(
          "/api/users",
          { name, userid, email, password },
          config,
        );
        data = res.data;
      }

      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      navigate("/chats");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-linear-to-br from-blue-800 via-blue-900 to-blackflex flex flex-1 flex-col overflow-hidden p-4 gap-4 md:flex-row">
      <div className="flex flex-col w-full md:w-1/3 rounded-3xl shadow-lg border overflow-hidden transition-all duration-300 p-4">
        <h1 className="text-4xl font-extrabold text-white text-center mb-8 tracking-tight">
          {isLogin ? "Welcome Back" : "Join Azurite"}
        </h1>

        {error && (
          <div className="bg-red-500/20 text-red-100 border border-red-500/50 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-6">
          {!isLogin && (
            <>
              <div>
                <label className="block text-blue-100 text-sm font-medium mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-blue-300/30 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-blue-100 text-sm font-medium mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  placeholder="Unique User ID"
                  value={userid}
                  onChange={(e) => setUserid(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-blue-300/30 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-blue-100 text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-blue-300/30 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-blue-100 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-blue-300/30 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-blue-200 mt-8 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-white hover:text-blue-300 transition-colors underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
      <aside className="p-5 flex justify-between items-center flex-col gap-3 md:h-full">
        <img src="/LogoFull.png" />
        <section className="flex items-center justify-center">
          <span className="text-blue-800 text-lg font-bold">
            Enjoy talking with your loved ones
          </span>
        </section>
      </aside>
    </div>
  );
};

export default LoginPage;
