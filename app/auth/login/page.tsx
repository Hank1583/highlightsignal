"use client";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setError("");

      const formData = new FormData(e.currentTarget);
      formData.append("app_id", "highlightsignal");

      const payload = Object.fromEntries(formData.entries());

      startTransition(async () => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!data.ok) {
          setError(data.message);
          return;
        }

        // Force a fresh request so the dashboard reads the new httpOnly cookie.
        window.location.replace("/dashboard");
      });
    }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-6">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white shadow-xl p-8 rounded-2xl border border-gray-100"
      >
        <h1 className="text-4xl font-extrabold text-center mb-3 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          歡迎回來
        </h1>
        <p className="text-center text-gray-500 mb-6">
          請登入您的帳號以繼續使用
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-gray-700 font-medium">Email</label>
            <div className="flex items-center mt-1 border rounded-xl px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-300">
              <Mail className="text-gray-500 mr-2" size={20} />
              <input
                type="email"
                name="email"
                required
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-gray-700 font-medium">密碼</label>
            <div className="flex items-center mt-1 border rounded-xl px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-300">
              <Lock className="text-gray-500 mr-2" size={20} />
              <input
                type="password"
                name="password"
                required
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button type="submit" disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                登入中...
              </>
            ) : (
              "登入"
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-5 text-sm">
          還沒有帳號？
          <Link href="/auth/register" className="text-blue-600 font-semibold ml-1">
            建立帳號
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
