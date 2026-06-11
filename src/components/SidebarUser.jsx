import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";

export default function SidebarUser({ navigate }) {
  const { user } = useAuth();
  if (!user) return (
    <div className="p-4 border-t border-white/5 flex-shrink-0">
      <button onClick={() => navigate("auth")}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border-0 bg-transparent cursor-pointer transition-colors">
        <i className="ti ti-login text-base" /> Sign in
      </button>
    </div>
  );
  return (
    <div className="p-3 border-t border-white/5 flex-shrink-0">
      <button onClick={() => navigate("profile", { userId: user.id })}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border-0 bg-transparent text-left">
        <Avatar name={user.displayName} url={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100 truncate">{user.displayName}</p>
          <p className="text-xs text-zinc-500 truncate">{user.role === "ARTIST" ? "Artist" : "Listener"}</p>
        </div>
      </button>
    </div>
  );
}
