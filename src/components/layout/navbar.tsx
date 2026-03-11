"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { XpCounter } from "@/components/gamification/XpCounter";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { LivesDisplay } from "@/components/gamification/LivesDisplay";
import { getSupabase } from "@/lib/supabase";

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/learn" className="text-xl font-extrabold text-green-600">
          FinLearn
        </Link>
        <div className="flex items-center gap-3">
          <StreakBadge />
          <XpCounter />
          <LivesDisplay />
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-green-600"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
