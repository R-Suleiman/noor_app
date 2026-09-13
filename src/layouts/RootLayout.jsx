import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import PlayerBar from "../components/PlayerBar";
import SidebarUser from "../components/SidebarUser";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";

const NAV = [
  { path: "/",        label: "Home",       icon: "ti-home"         },
  { path: "/browse",  label: "Browse",     icon: "ti-compass"      },
  { path: "/search",  label: "Search",     icon: "ti-search"       },
  { path: "/library", label: "My Library", icon: "ti-library"      },
  { path: "/upload",  label: "Upload",     icon: "ti-cloud-upload" },
  { path: "/admin",   label: "Admin",      icon: "ti-shield"       },
];

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { current } = usePlayer();
  const [moreOpen, setMoreOpen] = useState(false);
  const showPlayerBar = Boolean(current) && location.pathname !== "/now-playing";
  const visibleNav = NAV.filter((item) => {
    if (item.path === "/upload") return ["ARTIST", "ADMIN"].includes(user?.role);
    if (item.path === "/admin") return user?.role === "ADMIN";
    if (item.path === "/library") return Boolean(user);
    return true;
  });
  const mobilePrimaryNav = visibleNav.filter((item) => !["/upload", "/admin"].includes(item.path));
  const mobileMoreNav = visibleNav.filter((item) => ["/upload", "/admin"].includes(item.path));

  useEffect(() => setMoreOpen(false), [location.pathname]);

  return (
    <div className={`grid h-screen h-dvh grid-cols-1 overflow-hidden bg-zinc-950 text-zinc-100 md:grid-cols-[240px_minmax(0,1fr)] ${showPlayerBar ? "grid-rows-[minmax(0,1fr)_80px_calc(64px+env(safe-area-inset-bottom))] md:grid-rows-[minmax(0,1fr)_80px]" : "grid-rows-[minmax(0,1fr)_calc(64px+env(safe-area-inset-bottom))] md:grid-rows-[minmax(0,1fr)]"}`}
      style={{ fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>

      <aside className="hidden md:flex bg-zinc-900 border-r border-white/5 flex-col overflow-hidden row-start-1">
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/5 px-6 py-6">
          <img src="/pwa-icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
          <div>
            <p className="text-lg font-semibold tracking-wide text-emerald-400" style={{ fontFamily: "'Cinzel',serif" }}>نـور · Noor</p>
            <p className="mt-0.5 text-xs uppercase tracking-widest text-zinc-600">Islamic Audio</p>
          </div>
        </div>
        
        <nav className="p-3 flex-1 overflow-y-auto">
          {visibleNav.map(n => (
            <NavLink 
              key={n.path} 
              to={n.path}
              className={({ isActive }) => 
                `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors border-0 cursor-pointer text-left mb-0.5 no-underline ${
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                    : "bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`
              }
            >
              <i className={`ti ${n.icon} text-base w-5 text-center`} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        
        <SidebarUser navigate={navigate} />
      </aside>

      <nav aria-label="Mobile navigation" className={`${showPlayerBar ? "row-start-3" : "row-start-2"} relative z-40 flex items-stretch gap-0.5 border-t border-white/5 bg-zinc-900 px-1 pb-[env(safe-area-inset-bottom)] md:hidden`}>
        {mobilePrimaryNav.map((item) => (
          <NavLink key={item.path} to={item.path} aria-label={item.label} className={({ isActive }) => `min-w-0 flex-1 rounded-lg flex flex-col items-center justify-center gap-0.5 no-underline ${isActive ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500"}`}>
            <i className={`ti ${item.icon} text-lg`} />
            <span className="max-w-full truncate text-[9px] leading-none">{item.label === "My Library" ? "Library" : item.label}</span>
          </NavLink>
        ))}
        {mobileMoreNav.length > 0 && (
          <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-label="More options" className={`min-w-0 flex-1 rounded-lg border-0 bg-transparent flex flex-col items-center justify-center gap-0.5 cursor-pointer ${moreOpen || mobileMoreNav.some((item) => location.pathname === item.path) ? "text-emerald-400" : "text-zinc-500"}`}>
            <i className="ti ti-dots text-lg" />
            <span className="text-[9px] leading-none">More</span>
          </button>
        )}
        <button onClick={() => navigate(user ? `/profile/${user.id}` : "/auth")} aria-label={user ? "Profile" : "Sign in"} className={`min-w-0 flex-1 rounded-lg bg-transparent border-0 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${location.pathname.startsWith("/profile/") || location.pathname === "/auth" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500"}`}>
          <i className={`ti ${user ? "ti-user" : "ti-login"} text-lg`} />
          <span className="text-[9px] leading-none whitespace-nowrap">{user ? "Profile" : "Sign in"}</span>
        </button>
        {moreOpen && (
          <div className="absolute bottom-[calc(100%+0.5rem)] right-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-2 shadow-2xl shadow-black/60">
            {mobileMoreNav.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold no-underline ${isActive ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-300 hover:bg-white/5"}`}>
                <i className={`ti ${item.icon} text-lg`} aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <main id="main-content" className="row-start-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-contain md:col-start-2">
        <Outlet />
      </main>

      {showPlayerBar && <PlayerBar />}
    </div>
  );
}
