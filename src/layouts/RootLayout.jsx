import { Outlet, NavLink, useNavigate } from "react-router-dom";
import PlayerBar from "../components/PlayerBar";
import SidebarUser from "../components/SidebarUser";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  const visibleNav = NAV.filter((item) => {
    if (item.path === "/upload") return user?.role === "ARTIST";
    if (item.path === "/admin") return user?.role === "ADMIN";
    if (item.path === "/library") return Boolean(user);
    return true;
  });

  return (
    <div className="grid grid-cols-1 grid-rows-[56px_minmax(0,1fr)_80px] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_80px] bg-zinc-950 text-zinc-100 overflow-hidden h-screen"
      style={{ fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>

      <aside className="hidden md:flex bg-zinc-900 border-r border-white/5 flex-col overflow-hidden row-start-1">
        <div className="px-6 py-7 border-b border-white/5 flex-shrink-0">
          <p className="text-emerald-400 text-lg font-semibold tracking-wide" style={{ fontFamily: "'Cinzel',serif" }}>نـور · Noor</p>
          <p className="text-xs tracking-widest text-zinc-600 uppercase mt-0.5">Islamic Audio</p>
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

      <header className="md:hidden row-start-1 flex items-center gap-1 px-2 bg-zinc-900 border-b border-white/5 overflow-x-auto">
        {visibleNav.map((item) => (
          <NavLink key={item.path} to={item.path} aria-label={item.label} className={({ isActive }) => `w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500"}`}>
            <i className={`ti ${item.icon}`} />
          </NavLink>
        ))}
        <button onClick={() => navigate(user ? `/profile/${user.id}` : "/auth")} className="ml-auto w-10 h-10 rounded-lg bg-transparent border-0 text-zinc-400"><i className={`ti ${user ? "ti-user" : "ti-login"}`} /></button>
      </header>

      <main className="overflow-y-auto row-start-2 md:row-start-1 md:col-start-2">
        <Outlet />
      </main>

      <PlayerBar />
    </div>
  );
}
