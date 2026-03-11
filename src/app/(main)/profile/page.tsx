"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { LevelProgress } from "@/components/gamification/LevelProgress";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

const AVATARS = [
  "🐻", "🦊", "🐼", "🦁", "🐯", "🐺", "🦝", "🐨",
  "🦊", "🐸", "🐧", "🦉", "🦋", "🐬", "🦄", "🐲",
  "🧑‍💼", "👩‍💻", "🧑‍🎓", "🏆",
];

type UserData = {
  id: string;
  name: string | null;
  avatar: string;
  email: string;
  lessonsCompleted: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { xp, streak, hearts } = useGameStore();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.user?.id) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch(`/api/user?userId=${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          setNameInput(data.name ?? "");
        }
      } catch {
        // use gameStore fallback
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const saveName = async () => {
    if (!userData) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id, name: nameInput }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUserData((d) => d ? { ...d, name: updated.name } : d);
        setEditingName(false);
      }
    } finally {
      setSavingName(false);
    }
  };

  const saveAvatar = async (emoji: string) => {
    if (!userData) return;
    setUserData((d) => d ? { ...d, avatar: emoji } : d);
    setShowAvatarPicker(false);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userData.id, avatar: emoji }),
    });
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    setChangingPassword(true);
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg("Error: " + error.message);
    } else {
      setPasswordMsg("Contrasena cambiada correctamente.");
      setNewPassword("");
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Cargando perfil...</p>
      </div>
    );
  }

  const displayName = userData?.name ?? userData?.email?.split("@")[0] ?? "Usuario";
  const avatar = userData?.avatar ?? "🐻";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setShowAvatarPicker(true)}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl transition-transform hover:scale-105"
        >
          {avatar}
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm shadow">
            ✏️
          </span>
        </button>

        {/* Name */}
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="rounded-xl border-2 border-green-400 px-3 py-1.5 text-lg font-bold text-gray-800 outline-none"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
            />
            <Button onClick={saveName} disabled={savingName} className="text-sm">
              {savingName ? "..." : "Guardar"}
            </Button>
            <Button variant="ghost" onClick={() => setEditingName(false)} className="text-sm">
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-800">{displayName}</h1>
            <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-gray-600">
              ✏️
            </button>
          </div>
        )}

        {userData?.email && (
          <p className="text-sm text-gray-400">{userData.email}</p>
        )}
      </div>

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="mb-4 text-center text-lg font-extrabold text-gray-800">
              Elige tu avatar
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {AVATARS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => saveAvatar(emoji)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all hover:scale-110 ${
                    avatar === emoji ? "bg-green-100 ring-2 ring-green-500" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => setShowAvatarPicker(false)}
            >
              Cancelar
            </Button>
          </motion.div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid grid-cols-4 gap-3">
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{xp}</p>
          <p className="text-xs text-gray-500">XP total</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-xl font-bold text-orange-500">{streak}</p>
          <p className="text-xs text-gray-500">Racha</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-center">
          <p className="text-xl font-bold text-red-500">{hearts}</p>
          <p className="text-xs text-gray-500">Vidas</p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-xl font-bold text-green-600">{userData?.lessonsCompleted ?? 0}</p>
          <p className="text-xs text-gray-500">Lecciones</p>
        </div>
      </div>

      <div className="mt-6">
        <LevelProgress />
      </div>

      {/* Change password */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-700">Cambiar contrasena</h2>
        <input
          type="password"
          placeholder="Nueva contrasena (min. 6 caracteres)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-green-500"
        />
        {passwordMsg && (
          <p className={`mt-2 text-xs ${passwordMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
            {passwordMsg}
          </p>
        )}
        <Button
          onClick={changePassword}
          disabled={changingPassword}
          className="mt-3 w-full"
        >
          {changingPassword ? "Guardando..." : "Actualizar contrasena"}
        </Button>
      </div>

      {/* Logout */}
      <div className="mt-4">
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            await getSupabase().auth.signOut();
            router.push("/login");
          }}
        >
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
}
