import { Outlet, NavLink, useNavigate } from "react-router-dom";
import PlayerBar from "../components/PlayerBar";
import SidebarUser from "../components/SidebarUser";

const NAV = [
  { path: "/",        label: "Home",       icon: "ti-home"         },
  { path: "/browse",  label: "Browse",     icon: "ti-compass"      },
  { path: "/search",  label: "Search",     icon: "ti-search"       },
  { path: "/library", label: "My Library", icon: "ti-library"      },
  { path: "/upload",  label: "Upload",     icon: "ti-cloud-upload" },
];

export default function RootLayout() {
  const navigate = useNavigate();

  return (
    <div className="grid bg-zinc-950 text-zinc-100 overflow-hidden"
      style={{ gridTemplateColumns: "240px 1fr", gridTemplateRows: "1fr 80px", height: "100vh", fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>

      <aside className="bg-zinc-900 border-r border-white/5 flex flex-col overflow-hidden" style={{ gridRow: "1/2" }}>
        <div className="px-6 py-7 border-b border-white/5 flex-shrink-0">
          <p className="text-emerald-400 text-lg font-semibold tracking-wide" style={{ fontFamily: "'Cinzel',serif" }}>نـور · Noor</p>
          <p className="text-xs tracking-widest text-zinc-600 uppercase mt-0.5">Islamic Audio</p>
        </div>
        
        <nav className="p-3 flex-1 overflow-y-auto">
          {NAV.map(n => (
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

      <main className="overflow-y-auto" style={{ gridRow: "1/2" }}>
        <Outlet />
      </main>

      <PlayerBar />
    </div>
  );
}