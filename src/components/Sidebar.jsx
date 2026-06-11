import SidebarUser from "./SidebarUser";

const NAV = [
  { id:"home",    label:"Home",       icon:"ti-home"         },
  { id:"browse",  label:"Browse",     icon:"ti-compass"      },
  { id:"library", label:"My Library", icon:"ti-library"      },
  { id:"upload",  label:"Upload",     icon:"ti-cloud-upload" },
];

export default function Sidebar({ page, navigate, setShowAuth }) {
  return (
    <aside className="bg-zinc-900 border-r border-white/5 flex flex-col overflow-hidden" style={{gridRow:"1/2"}}>
      <div className="px-6 py-7 border-b border-white/5 flex-shrink-0">
        <p className="text-emerald-400 text-lg font-semibold tracking-wide" style={{fontFamily:"'Cinzel',serif"}}>نـور · Noor</p>
        <p className="text-xs tracking-widest text-zinc-600 uppercase mt-0.5">Islamic Audio</p>
      </div>

      <nav className="p-3 flex-1 overflow-y-auto">
        {NAV.map(n => (
          <button key={n.id} onClick={() => navigate(n.id)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors border-0 cursor-pointer text-left mb-0.5 ${page===n.id ? "bg-emerald-500/10 text-emerald-400" : "bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}>
            <i className={`ti ${n.icon} text-base w-5 text-center`} />{n.label}
          </button>
        ))}
      </nav>

      <SidebarUser navigate={navigate} setShowAuth={setShowAuth} />
    </aside>
  );
}
