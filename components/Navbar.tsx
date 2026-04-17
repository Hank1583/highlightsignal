"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all ${
        scrolled ? "bg-white/90 shadow" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        
        {/* LOGO + BRAND */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-hl.png"
            alt="Highlight Signal Logo"
            width={60}
            height={60}
            className="transition-all duration-300"
            priority
          />
          
          <span
            className={`text-xl font-bold transition ${
              scrolled ? "text-blue-700" : "text-white"
            }`}
          >
            Highlight Signal
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 text-lg">
          <Link
            href="#modules"
            className={`transition ${
              scrolled ? "text-gray-800" : "text-white"
            } hover:opacity-70`}
          >
            功能模組
          </Link>
          <Link
            href="/pricing"
            className={`transition ${
              scrolled ? "text-gray-800" : "text-white"
            } hover:opacity-70`}
          >
            方案價格
          </Link>
          <Link
            href="/contact"
            className={`transition ${
              scrolled ? "text-gray-800" : "text-white"
            } hover:opacity-70`}
          >
            聯絡我們
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex gap-3">
          <Link
            href="/enter"
            className={`px-4 py-2 rounded-xl font-semibold transition ${
              scrolled
                ? "border border-blue-600 text-blue-700 hover:bg-blue-50"
                : "border border-white text-white hover:bg-white/20"
            }`}
          >
            登入
          </Link>

          <Link
            href="/auth/register"
            className={`px-4 py-2 rounded-xl font-semibold shadow transition ${
              scrolled
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white text-blue-700 hover:bg-blue-100"
            }`}
          >
            註冊
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className={`md:hidden transition ${
            scrolled ? "text-blue-700" : "text-white"
          }`}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white shadow-md"
        >
          <div className="px-6 py-4 flex flex-col gap-4 text-gray-800">
            <Link href="#modules" onClick={() => setOpen(false)}>
              功能模組
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>
              方案價格
            </Link>
            <Link href="/contact" onClick={() => setOpen(false)}>
              聯絡我們
            </Link>

            <div className="flex gap-3 pt-3 border-t">
              <Link
            href="/enter"
                className="px-4 py-2 border border-blue-600 text-blue-700 rounded-xl w-full text-center"
              >
                登入
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl w-full text-center"
              >
                註冊
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
}
