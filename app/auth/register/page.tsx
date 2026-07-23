"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: any) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // V12-01: single same-origin BFF call -- this route handles
      // register -> auto-login -> Workspace provisioning server-side as one
      // saga (previously this called the external register.php directly
      // from the Browser, with no BFF at all).
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const result = await res.json().catch(() => null);

      if (!result) {
        setError("伺服器回應格式錯誤，請稍後再試");
        setLoading(false);
        return;
      }

      if (!result.ok) {
        // phase === "register": the account itself was never created.
        setError(result.message || "註冊失敗");
        setLoading(false);
        return;
      }

      if (!result.loggedIn) {
        // Account created, auto-login failed -- a recoverable partial
        // failure, not a dead end: send them to manually log in.
        setSuccess(result.message || "帳號已建立，請手動登入。");
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 1500);
        setLoading(false);
        return;
      }

      // Logged in -- whether or not Workspace provisioning itself
      // succeeded, WorkspaceProvider's reactive fallback catches that case
      // on the Dashboard's first load, so it's still safe to proceed.
      setSuccess(result.message || "註冊成功！正在進入 Dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch {
      setError("伺服器連線失敗，請稍後再試");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white shadow-lg p-8 rounded-2xl"
      >
        <h1 className="text-3xl font-bold text-center mb-6">建立帳號</h1>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-gray-700 font-medium">姓名</label>
            <div className="flex items-center mt-1 border rounded-xl px-3 py-2 bg-gray-50">
              <User className="text-gray-500 mr-2" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="您的名字"
                className="w-full bg-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-gray-700 font-medium">Email</label>
            <div className="flex items-center mt-1 border rounded-xl px-3 py-2 bg-gray-50">
              <Mail className="text-gray-500 mr-2" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-gray-700 font-medium">密碼</label>
            <div className="flex items-center mt-1 border rounded-xl px-3 py-2 bg-gray-50">
              <Lock className="text-gray-500 mr-2" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="建立密碼"
                className="w-full bg-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Error or Success */}
          {error && <p className="text-red-600 text-center">{error}</p>}
          {success && <p className="text-green-600 text-center">{success}</p>}

          {/* V12-05: consent/notice -- the registration form had no link to
              either policy at all before this audit. */}
          <p className="text-center text-xs text-gray-500">
            註冊即表示您同意我們的
            <Link href="/terms" className="text-blue-600 font-semibold mx-1">
              服務條款
            </Link>
            與
            <Link href="/privacy" className="text-blue-600 font-semibold ml-1">
              隱私政策
            </Link>
            。
          </p>

          {/* Register Button */}
          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-5 text-sm">
          已經有帳號？
          <Link href="/auth/login" className="text-blue-600 font-semibold ml-1">
            立即登入
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
