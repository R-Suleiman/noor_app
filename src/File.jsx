import { useState, useRef, useEffect, createContext, useContext, useCallback } from "react";

// ─── Howler loaded from CDN ───────────────────────────────────────────────────
// In your real Vite project: npm install howler
// Here we load it from CDN via a script tag injected once on mount.
function useHowlerScript() {
  const [ready, setReady] = useState(typeof Howl !== "undefined");
  useEffect(() => {
    if (typeof Howl !== "undefined") { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API = "http://localhost:3001/api/v1";

// ─── Mock fallback ────────────────────────────────────────────────────────────
const MOCK_TRACKS = [
  { id:"t1", title:"Ya Nabi Salam Alayka", artist:{ id:"a1", name:"Madrassa Al-Noor"  }, genre:"QASIDAS",      duration:272, playCount:124000 },
  { id:"t2", title:"Tala Al Badru Alayna", artist:{ id:"a2", name:"Sheikh Abdullah"   }, genre:"NASHEEDS",     duration:198, playCount:89000  },
  { id:"t3", title:"Duff Ensemble Vol. 1", artist:{ id:"a3", name:"Dar Al-Qasida"     }, genre:"DUFF",         duration:344, playCount:52000  },
  { id:"t4", title:"Mawlid Al Nabi",       artist:{ id:"a1", name:"Madrassa Al-Noor"  }, genre:"QASIDAS",      duration:370, playCount:201000 },
  { id:"t5", title:"Subhanallah",          artist:{ id:"a2", name:"Sheikh Abdullah"   }, genre:"NASHEEDS",     duration:235, playCount:67000  },
  { id:"t6", title:"Oud Reflections",      artist:{ id:"a4", name:"Hassan Al-Oud"     }, genre:"INSTRUMENTAL", duration:442, playCount:38000  },
];
const MOCK_ARTISTS = [
  { id:"a1", name:"Madrassa Al-Noor", isMadrassa:true,  isVerified:true,  _count:{tracks:47,albums:4}, user:{_count:{followers:1240}} },
  { id:"a2", name:"Sheikh Abdullah",  isMadrassa:false, isVerified:true,  _count:{tracks:22,albums:2}, user:{_count:{followers:1920}} },
  { id:"a3", name:"Dar Al-Qasida",    isMadrassa:false, isVerified:false, _count:{tracks:31,albums:3}, user:{_count:{followers:810 }} },
  { id:"a4", name:"Hassan Al-Oud",    isMadrassa:false, isVerified:false, _count:{tracks:14,albums:1}, user:{_count:{followers:420 }} },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GENRE_BG = { QASIDAS:"bg-emerald-800", NASHEEDS:"bg-violet-800", DUFF:"bg-orange-800", INSTRUMENTAL:"bg-amber-800", MADRASSA:"bg-teal-800", OTHER:"bg-zinc-700" };
const trackBg  = t => t.bg ?? GENRE_BG[t.genre] ?? "bg-zinc-700";
const fmtDur   = s => { if (!s || isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; };
const fmtNum   = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n ?? 0);

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("noor_token");
  const res   = await fetch(`${API}${path}`, {
    headers: { "Content-Type":"application/json", ...(token && { Authorization:`Bearer ${token}` }), ...opts.headers },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}



// ─── Auth page ────────────────────────────────────────────────────────────────
function AuthPage({ onDone }) {
  const [mode,  setMode]  = useState("login");
  const [role,  setRole]  = useState("LISTENER");
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);
  const [f, setF] = useState({ email:"", password:"", username:"", displayName:"", bio:"", location:"", isMadrassa:false });
  const { login, register } = useAuth();
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const submit = async () => {
    setError(""); setBusy(true);
    try { mode === "login" ? await login(f.email, f.password) : await register({ ...f, role }); onDone(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const Input = ({ label, k, type="text", ph }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">{label}</label>
      <input type={type} value={f[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
        className="bg-zinc-800 border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-emerald-400 text-3xl font-semibold tracking-wide mb-1" style={{fontFamily:"'Cinzel',serif"}}>نـور · Noor</p>
          <p className="text-xs tracking-widest text-zinc-600 uppercase">Islamic Audio</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8">
          <div className="flex bg-zinc-800 rounded-lg p-0.5 mb-6">
            {[["login","Sign in"],["register","Create account"]].map(([m,l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer border-0 ${mode===m ? "bg-zinc-700 text-zinc-100" : "bg-transparent text-zinc-500 hover:text-zinc-300"}`}>{l}</button>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {mode === "register" && <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  {[["LISTENER","Listener","ti-headphones"],["ARTIST","Artist / Madrassa","ti-microphone-2"]].map(([r,l,ic]) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm cursor-pointer transition-all ${role===r ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/8 bg-zinc-800 text-zinc-400 hover:border-white/20"}`}>
                      <i className={`ti ${ic}`} />{l}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Display name" k="displayName" ph="How you'll appear on Noor" />
              <Input label="Username"     k="username"    ph="lowercase_only" />
              {role === "ARTIST" && <>
                <Input label="Bio (optional)"      k="bio"      ph="Tell listeners about yourself" />
                <Input label="Location (optional)" k="location" ph="e.g. Dar es Salaam" />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={f.isMadrassa} onChange={e => set("isMadrassa", e.target.checked)} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                  <span className="text-sm text-zinc-300">This is a Madrassa account</span>
                </label>
              </>}
            </>}
            <Input label="Email"    k="email"    type="email"    ph="you@example.com" />
            <Input label="Password" k="password" type="password" ph="••••••••" />
            {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={submit} disabled={busy}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold py-3 rounded-lg border-0 cursor-pointer transition-colors mt-1">
              {busy ? <Spinner /> : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
const GENRES = ["All","Qasidas","Nasheeds","Duff","Instrumental","Madrassa"];

function HomePage({ navigate }) {
  const [tracks,  setTracks]  = useState(MOCK_TRACKS);
  const [artists, setArtists] = useState(MOCK_ARTISTS);
  const { play } = usePlayer();

  useEffect(() => {
    apiFetch("/tracks/trending").then(d => setTracks(d.tracks)).catch(() => {});
    apiFetch("/artists").then(d => setArtists(d.artists)).catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="relative rounded-2xl bg-zinc-800/50 border border-white/5 p-9 mb-10 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 pointer-events-none" />
        <div className="absolute -bottom-10 right-32 w-36 h-36 rounded-full bg-yellow-500/8 pointer-events-none" />
        <p className="text-xs font-semibold tracking-widest uppercase text-yellow-400/70 mb-2">Assalamu Alaykum</p>
        <h1 className="text-3xl font-semibold text-zinc-100 leading-snug mb-5 relative z-10" style={{fontFamily:"'Cinzel',serif"}}>
          Discover the voice<br />of devotion
        </h1>
        <button onClick={() => tracks.length && play(tracks[0], tracks)}
          className="relative z-10 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors border-0 cursor-pointer">
          <i className="ti ti-player-play" /> Start listening
        </button>
      </div>

      <p className="text-xs tracking-widest uppercase font-semibold text-zinc-500 mb-4">Trending tracks</p>
      <div className="flex flex-col gap-0.5 mb-10">
        {tracks.map((t,i) => <TrackRow key={t.id} track={t} index={i} />)}
      </div>

      <p className="text-xs tracking-widest uppercase font-semibold text-zinc-500 mb-4">Featured artists</p>
      <div className="grid grid-cols-4 gap-4">
        {artists.map(a => (
          <div key={a.id} onClick={() => navigate("artist", { artistId: a.id })}
            className="bg-zinc-800/50 border border-white/5 rounded-xl p-4 flex flex-col items-center text-center cursor-pointer hover:border-white/10 hover:-translate-y-0.5 transition-all">
            <Avatar name={a.name} size="lg" className="mb-3" />
            <p className="text-sm font-semibold text-zinc-100 truncate w-full">{a.name}</p>
            {a.isMadrassa && <span className="text-xs text-yellow-400/70 mt-0.5">Madrassa</span>}
            <p className="text-xs text-zinc-400 mt-1">{a._count?.tracks ?? 0} tracks · {fmtNum(a.user?._count?.followers)} followers</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowsePage() {
  const [genre,   setGenre]   = useState("All");
  const [tracks,  setTracks]  = useState(MOCK_TRACKS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const g = genre !== "All" ? `?genre=${genre.slice(0,-1).toUpperCase()}` : "";
    apiFetch(`/tracks${g}`).then(d => setTracks(d.tracks)).catch(() => setTracks(MOCK_TRACKS)).finally(() => setLoading(false));
  }, [genre]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-zinc-100" style={{fontFamily:"'Cinzel',serif"}}>Browse</h1>
        <p className="text-zinc-400 text-sm mt-1">Explore by genre, artist, or collection</p>
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {GENRES.map(g => (
          <button key={g} onClick={() => setGenre(g)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${genre===g ? "bg-emerald-600 border-emerald-600 text-white" : "bg-transparent border-white/10 text-zinc-400 hover:border-emerald-500/60 hover:text-emerald-400"}`}>{g}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-12"><Spinner /></div>
        : <div className="flex flex-col gap-0.5">{tracks.map((t,i) => <TrackRow key={t.id} track={t} index={i} />)}</div>}
    </div>
  );
}

function LibraryPage({ navigate }) {
  const [tab, setTab] = useState("liked");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || tab !== "liked") return;
    setLoading(true);
    apiFetch(`/users/${user.id}/liked`).then(d => setTracks(d.tracks)).catch(() => {}).finally(() => setLoading(false));
  }, [tab, user]);

  if (!user) return (
    <div className="p-8 flex flex-col items-center py-24 text-center">
      <i className="ti ti-lock text-5xl text-zinc-700 block mb-4" />
      <h3 className="text-lg text-zinc-400 mb-2" style={{fontFamily:"'Cinzel',serif"}}>Sign in to view your library</h3>
      <p className="text-sm text-zinc-600">Your liked tracks and playlists live here</p>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={user.displayName} url={user.avatarUrl} size="md" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100" style={{fontFamily:"'Cinzel',serif"}}>{user.displayName}</h1>
          <p className="text-sm text-zinc-400">@{user.username}</p>
        </div>
        <button onClick={() => navigate("profile", { userId: user.id })}
          className="ml-auto text-xs text-zinc-400 hover:text-zinc-200 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg bg-transparent cursor-pointer transition-colors">
          View profile
        </button>
      </div>
      <div className="flex gap-1 border-b border-white/5 mb-7">
        {[["liked","Liked tracks"],["playlists","Playlists"],["albums","Albums"],["artists","Following"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm bg-transparent border-0 border-b-2 -mb-px cursor-pointer transition-colors ${tab===id ? "text-emerald-400 border-emerald-500" : "text-zinc-400 border-transparent hover:text-zinc-200"}`}>{label}</button>
        ))}
      </div>
      {tab === "liked" && (
        loading ? <div className="flex justify-center py-12"><Spinner /></div>
          : tracks.length ? <div className="flex flex-col gap-0.5">{tracks.map((t,i) => <TrackRow key={t.id} track={t} index={i} liked />)}</div>
          : <div className="flex flex-col items-center py-16"><i className="ti ti-heart text-5xl text-zinc-700 block mb-4" /><p className="text-zinc-400 text-sm">Like tracks and they'll appear here</p></div>
      )}
      {tab !== "liked" && <div className="flex flex-col items-center py-16"><i className="ti ti-music text-5xl text-zinc-700 block mb-4" /><p className="text-zinc-400 text-sm">Coming in Phase 5</p></div>}
    </div>
  );
}

function ArtistPage({ artistId, navigate }) {
  const [artist,    setArtist]    = useState(null);
  const [tracks,    setTracks]    = useState([]);
  const [tab,       setTab]       = useState("tracks");
  const [following, setFollowing] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuth();
  const { play } = usePlayer();

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    Promise.all([apiFetch(`/artists/${artistId}`), apiFetch(`/artists/${artistId}/tracks`)])
      .then(([a,t]) => { setArtist(a.artist); setTracks(t.artist.tracks); })
      .catch(() => { setArtist(MOCK_ARTISTS.find(a => a.id === artistId) ?? MOCK_ARTISTS[0]); setTracks(MOCK_TRACKS.slice(0,4)); })
      .finally(() => setLoading(false));
  }, [artistId]);

  const handleFollow = async () => {
    if (!user) return;
    const next = !following; setFollowing(next);
    try { await apiFetch(`/users/${artist?.user?.id ?? artistId}/follow`, { method: next ? "POST" : "DELETE" }); }
    catch { setFollowing(!next); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!artist) return <div className="p-8 text-zinc-400">Artist not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className={`relative h-56 ${trackBg(tracks[0] ?? {})} flex items-end`}>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        <div className="relative z-10 flex items-end gap-6 p-8 w-full">
          <Avatar name={artist.name} url={artist.avatarUrl} size="xl" className="ring-4 ring-zinc-950" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {artist.isMadrassa && <span className="text-xs bg-yellow-400/15 text-yellow-400 px-2 py-0.5 rounded font-medium">Madrassa</span>}
              {artist.isVerified && <i className="ti ti-rosette-discount-check text-emerald-400 text-lg" />}
            </div>
            <h1 className="text-3xl font-semibold text-zinc-100 truncate" style={{fontFamily:"'Cinzel',serif"}}>{artist.name}</h1>
            <p className="text-zinc-400 text-sm mt-1">{artist._count?.tracks ?? 0} tracks · {fmtNum(artist.user?._count?.followers)} followers{artist.location ? ` · ${artist.location}` : ""}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {tracks.length > 0 && (
              <button onClick={() => play(tracks[0], tracks)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full border-0 cursor-pointer transition-colors">
                <i className="ti ti-player-play" /> Play
              </button>
            )}
            {user && (
              <button onClick={handleFollow}
                className={`px-5 py-2.5 text-sm font-semibold rounded-full border cursor-pointer transition-all ${following ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" : "border-white/20 text-zinc-300 bg-transparent hover:border-white/40"}`}>
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="p-8">
        {artist.bio && <p className="text-zinc-400 text-sm mb-6 max-w-2xl">{artist.bio}</p>}
        <div className="flex gap-1 border-b border-white/5 mb-6">
          {[["tracks","Tracks"],["albums","Albums"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm bg-transparent border-0 border-b-2 -mb-px cursor-pointer transition-colors ${tab===id ? "text-emerald-400 border-emerald-500" : "text-zinc-400 border-transparent hover:text-zinc-200"}`}>{label}</button>
          ))}
        </div>
        {tab === "tracks" && (
          <div className="flex flex-col gap-0.5">
            {tracks.map((t,i) => <TrackRow key={t.id} track={t} index={i} />)}
            {!tracks.length && <p className="text-zinc-600 text-sm py-8 text-center">No tracks yet</p>}
          </div>
        )}
        {tab === "albums" && (
          <div className="grid grid-cols-4 gap-4">
            {(artist.albums ?? []).map(al => (
              <div key={al.id} className="bg-zinc-800/50 border border-white/5 rounded-xl p-4 cursor-pointer hover:-translate-y-0.5 transition-all">
                <div className="w-full aspect-square rounded-lg mb-3 bg-emerald-800 flex items-center justify-center">
                  <i className="ti ti-disc text-white/40 text-3xl" />
                </div>
                <p className="text-sm font-semibold text-zinc-100 truncate">{al.title}</p>
                <p className="text-xs text-zinc-400 mt-1">{al.releaseYear ?? "—"} · {al._count?.tracks ?? 0} tracks</p>
              </div>
            ))}
            {!artist.albums?.length && <p className="text-zinc-600 text-sm py-8 col-span-4 text-center">No albums yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePage({ userId, navigate }) {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ displayName:"", bio:"", location:"" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const uid   = userId ?? authUser?.id;
  const isOwn = authUser?.id === uid;

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    apiFetch(`/users/${uid}`)
      .then(d => { setProfile(d.user); setForm({ displayName: d.user.displayName, bio: d.user.artistProfile?.bio ?? "", location: d.user.artistProfile?.location ?? "" }); })
      .catch(() => setProfile(authUser))
      .finally(() => setLoading(false));
  }, [uid]);

  const save = async () => {
    setSaving(true); setError("");
    try { const d = await apiFetch(`/users/${uid}`, { method:"PATCH", body:JSON.stringify(form) }); setProfile(d.user); setEditing(false); }
    catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  const p = profile ?? authUser;
  if (!p) return <div className="p-8 flex flex-col items-center py-24 text-center"><i className="ti ti-user-x text-5xl text-zinc-700 block mb-4" /><p className="text-zinc-400">Sign in to view your profile</p></div>;

  const artist = p?.artistProfile;
  const counts = p?._count ?? {};

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start gap-5 mb-8">
        <Avatar name={p.displayName} url={p.avatarUrl} size="xl" />
        <div className="flex-1 min-w-0">
          {editing
            ? <input value={form.displayName} onChange={e => setForm(f => ({...f, displayName: e.target.value}))} className="bg-zinc-800 border border-emerald-500 rounded-lg px-3 py-2 text-lg font-semibold text-zinc-100 outline-none w-full mb-2" />
            : <h1 className="text-2xl font-semibold text-zinc-100 mb-0.5" style={{fontFamily:"'Cinzel',serif"}}>{p.displayName}</h1>}
          <p className="text-sm text-zinc-400 mb-3">@{p.username} · {p.role === "ARTIST" ? (artist?.isMadrassa ? "Madrassa" : "Artist") : "Listener"}</p>
          <div className="flex gap-5">
            {[["Followers", counts.followers ?? 0],["Following", counts.following ?? 0],["Liked", counts.likes ?? 0]].map(([l,v]) => (
              <div key={l}><span className="text-sm font-semibold text-zinc-100">{fmtNum(v)}</span> <span className="text-xs text-zinc-500">{l}</span></div>
            ))}
          </div>
        </div>
        {isOwn && (
          <div className="flex gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer">
                  {saving ? <Spinner sm /> : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs text-zinc-400 border border-white/10 px-3 py-1.5 rounded-lg bg-transparent cursor-pointer">Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-200 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg bg-transparent cursor-pointer transition-colors"><i className="ti ti-pencil mr-1" />Edit</button>
                <button onClick={logout} className="text-xs text-zinc-500 hover:text-red-400 border border-white/8 hover:border-red-400/30 px-3 py-1.5 rounded-lg bg-transparent cursor-pointer transition-colors">Sign out</button>
              </>
            )}
          </div>
        )}
      </div>
      {(artist || (isOwn && p.role === "ARTIST")) && (
        <div className="bg-zinc-800/40 border border-white/5 rounded-xl p-5 mb-6">
          <p className="text-xs tracking-widest uppercase font-semibold text-zinc-500 mb-3">Artist info</p>
          {editing ? (
            <div className="flex flex-col gap-3">
              <div><label className="text-xs text-zinc-500 block mb-1">Bio</label><textarea value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} rows={3} className="w-full bg-zinc-800 border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none resize-none" /></div>
              <div><label className="text-xs text-zinc-500 block mb-1">Location</label><input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} className="w-full bg-zinc-800 border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none" /></div>
            </div>
          ) : (
            <>
              {artist?.bio      && <p className="text-sm text-zinc-300 mb-3">{artist.bio}</p>}
              {artist?.location && <p className="text-xs text-zinc-500"><i className="ti ti-map-pin mr-1" />{artist.location}</p>}
              {!artist?.bio && isOwn && <p className="text-sm text-zinc-600 italic">Add a bio to tell listeners about yourself</p>}
            </>
          )}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      )}
      {artist && (
        <>
          <p className="text-xs tracking-widest uppercase font-semibold text-zinc-500 mb-4">{artist._count?.tracks ?? 0} tracks</p>
          <div className="flex flex-col gap-0.5">
            {(artist.tracks ?? []).map((t,i) => <TrackRow key={t.id} track={{...t, artist:{name:p.displayName}}} index={i} />)}
            {!artist.tracks?.length && (
              <div className="text-center py-12 text-zinc-600">
                <i className="ti ti-music-off text-4xl block mb-3" />
                <p className="text-sm">No tracks uploaded yet</p>
                {isOwn && <button onClick={() => navigate("upload")} className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 bg-transparent border-0 cursor-pointer">Upload your first track →</button>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UploadPage() {
  const { user } = useAuth();
  const [f, setF] = useState({ title:"", titleAr:"", titleSw:"", genre:"QASIDAS", language:"ARABIC" });
  const [audioFile, setAudioFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const set = (k,v) => setF(x => ({...x,[k]:v}));

  if (!user || user.role !== "ARTIST") return (
    <div className="p-8 flex flex-col items-center py-24 text-center">
      <i className="ti ti-lock text-5xl text-zinc-700 block mb-4" />
      <h3 className="text-lg text-zinc-400 mb-2" style={{fontFamily:"'Cinzel',serif"}}>Artist account required</h3>
      <p className="text-sm text-zinc-600">Only artists and madrassas can upload tracks</p>
    </div>
  );

  const submit = async () => {
    if (!audioFile) { setError("Please select an audio file"); return; }
    if (!f.title) { setError("Title is required"); return; }
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      Object.entries(f).forEach(([k,v]) => v && fd.append(k, v));
      const token = localStorage.getItem("noor_token");
      const res   = await fetch(`${API}/upload/track`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="p-8 flex flex-col items-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4"><i className="ti ti-check text-3xl text-emerald-400" /></div>
      <h3 className="text-xl text-zinc-100 mb-2" style={{fontFamily:"'Cinzel',serif"}}>Track uploaded!</h3>
      <p className="text-sm text-zinc-400 mb-5">Your track is now live on Noor</p>
      <button onClick={() => { setDone(false); setAudioFile(null); setF({ title:"", titleAr:"", titleSw:"", genre:"QASIDAS", language:"ARABIC" }); }}
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg border-0 cursor-pointer transition-colors">Upload another</button>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-zinc-100" style={{fontFamily:"'Cinzel',serif"}}>Upload a Track</h1>
        <p className="text-zinc-400 text-sm mt-1">Share your Qasidas and Nasheeds with the community</p>
      </div>
      <label className={`group block border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all mb-8 ${audioFile ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5"}`}>
        <input type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files?.[0] ?? null)} />
        <i className={`ti ${audioFile ? "ti-file-music" : "ti-cloud-upload"} text-4xl block mb-3 transition-colors ${audioFile ? "text-emerald-400" : "text-zinc-600 group-hover:text-emerald-500"}`} />
        {audioFile
          ? <><p className="text-sm font-medium text-emerald-400">{audioFile.name}</p><p className="text-xs text-zinc-500 mt-1">{(audioFile.size/1024/1024).toFixed(1)} MB</p></>
          : <><p className="text-base font-medium text-zinc-300 mb-1">Drop your audio file here</p><p className="text-xs text-zinc-600">MP3, WAV, FLAC · up to 200 MB</p></>}
      </label>
      <div className="grid grid-cols-2 gap-5">
        {[["Track title","title","col-span-2","e.g. Ya Nabi Salam Alayka"],["Arabic title","titleAr","","بالعربية"],["Swahili title","titleSw","","Kwa Kiswahili"]].map(([label,k,span,ph]) => (
          <div key={k} className={`flex flex-col gap-2 ${span}`}>
            <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">{label}</label>
            <input value={f[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
              className="bg-zinc-800 border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 w-full" />
          </div>
        ))}
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">Genre</label>
          <select value={f.genre} onChange={e => set("genre", e.target.value)} className="bg-zinc-800 border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 cursor-pointer w-full">
            {["QASIDAS","NASHEEDS","DUFF","INSTRUMENTAL","MADRASSA","OTHER"].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">Language</label>
          <select value={f.language} onChange={e => set("language", e.target.value)} className="bg-zinc-800 border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 cursor-pointer w-full">
            {["ARABIC","SWAHILI","ENGLISH","URDU","OTHER"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">{error}</p>}
      <div className="flex gap-3 mt-7">
        <button onClick={submit} disabled={busy}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg border-0 cursor-pointer transition-colors">
          {busy ? <><Spinner /> Uploading…</> : <><i className="ti ti-upload" /> Upload track</>}
        </button>
      </div>
    </div>
  );
}

// ─── Bottom player — real Howler controls ────────────────────────────────────
function Player() {
  const { current, playing, buffering, progress, elapsed, duration, volume, togglePlay, seek, setVolume, playNext, playPrev } = usePlayer();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragVal,  setDragVal]  = useState(0);
  const barRef = useRef(null);

  // Reset liked state when track changes
  useEffect(() => { setLiked(false); }, [current?.id]);

  const handleLike = async () => {
    if (!user || !current) return;
    const next = !liked; setLiked(next);
    try { await apiFetch(`/tracks/${current.id}/like`, { method: next ? "POST" : "DELETE" }); }
    catch { setLiked(!next); }
  };

  // Seek bar: click or drag
  const getPct = (e) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
  };
  const onBarMouseDown = (e) => { setDragging(true); setDragVal(getPct(e)); };
  useEffect(() => {
    if (!dragging) return;
    const onMove = e => setDragVal(getPct(e));
    const onUp   = e => { seek(getPct(e)); setDragging(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, seek]);

  const displayPct = dragging ? dragVal : progress;

  return (
    <div className="col-span-2 bg-zinc-900 border-t border-white/5 grid items-center px-6 gap-6"
      style={{ gridTemplateColumns:"280px 1fr 200px", height:80 }}>

      {/* Track info */}
      <div className="flex items-center gap-3 min-w-0">
        {current ? (
          <>
            <div className={`w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0 ${trackBg(current)}`}>
              {buffering ? <Spinner sm /> : <i className="ti ti-music text-white/60 text-sm" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100 truncate">{current.title}</p>
              <p className="text-xs text-zinc-400 truncate">{current.artist?.name ?? current.artist}</p>
            </div>
            <button onClick={handleLike} className={`bg-transparent border-0 text-base cursor-pointer p-1 transition-colors flex-shrink-0 ${liked ? "text-pink-400" : "text-zinc-600 hover:text-pink-400"}`}>
              <i className="ti ti-heart" />
            </button>
          </>
        ) : <p className="text-xs text-zinc-600">Double-click a track to play</p>}
      </div>

      {/* Controls + seek */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          <button className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1"><i className="ti ti-arrows-shuffle" /></button>
          <button onClick={playPrev} className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1 disabled:opacity-40" disabled={!current}><i className="ti ti-player-skip-back" /></button>
          <button onClick={togglePlay} disabled={!current}
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed flex items-center justify-center text-white border-0 cursor-pointer transition-colors text-base flex-shrink-0">
            {buffering ? <Spinner sm /> : <i className={`ti ${playing ? "ti-player-pause" : "ti-player-play"}`} />}
          </button>
          <button onClick={playNext}  className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1 disabled:opacity-40" disabled={!current}><i className="ti ti-player-skip-forward" /></button>
          <button className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1"><i className="ti ti-repeat" /></button>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-2.5 w-full">
          <span className="text-xs text-zinc-600 w-8 text-right tabular-nums">{fmtDur(elapsed)}</span>
          <div ref={barRef}
            className="flex-1 h-1 bg-zinc-700 rounded-full cursor-pointer group relative"
            onMouseDown={onBarMouseDown}>
            {/* Buffering shimmer */}
            {buffering && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-zinc-500 animate-pulse rounded-full" />
              </div>
            )}
            {/* Progress fill */}
            <div className="h-full rounded-full bg-emerald-500 group-hover:bg-yellow-400 transition-colors pointer-events-none"
              style={{ width:`${displayPct}%` }} />
            {/* Drag handle */}
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow"
              style={{ left:`calc(${displayPct}% - 6px)` }} />
          </div>
          <span className="text-xs text-zinc-600 w-8 tabular-nums">{fmtDur(duration || current?.duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2.5 justify-end">
        <button onClick={() => setVolume(volume > 0 ? 0 : 0.75)}
          className="bg-transparent border-0 text-zinc-500 hover:text-zinc-300 text-base cursor-pointer p-0.5 flex-shrink-0 transition-colors">
          <i className={`ti ${volume === 0 ? "ti-volume-off" : volume < 0.4 ? "ti-volume" : "ti-volume-2"}`} />
        </button>
        <div className="w-20 h-1 bg-zinc-700 rounded-full cursor-pointer group relative"
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setVolume((e.clientX - r.left) / r.width); }}>
          <div className="h-full rounded-full bg-zinc-400 group-hover:bg-zinc-200 transition-colors" style={{width:`${volume * 100}%`}} />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar user slot ────────────────────────────────────────────────────────
function SidebarUser({ navigate, setShowAuth }) {
  const { user } = useAuth();
  if (!user) return (
    <div className="p-4 border-t border-white/5 flex-shrink-0">
      <button onClick={() => setShowAuth(true)}
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

// ─── Root ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"home",    label:"Home",       icon:"ti-home"         },
  { id:"browse",  label:"Browse",     icon:"ti-compass"      },
  { id:"library", label:"My Library", icon:"ti-library"      },
  { id:"upload",  label:"Upload",     icon:"ti-cloud-upload" },
];

export default function App() {
  const [page,       setPage]       = useState("home");
  const [pageParams, setPageParams] = useState({});
  const [showAuth,   setShowAuth]   = useState(false);
  const navigate = (p, params = {}) => { setPage(p); setPageParams(params); };

  return (
    <AuthProvider>
      <PlayerProvider>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&display=swap" rel="stylesheet" />

        {showAuth
          ? <AuthPage onDone={() => setShowAuth(false)} />
          : (
            <div className="grid bg-zinc-950 text-zinc-100 overflow-hidden"
              style={{ gridTemplateColumns:"240px 1fr", gridTemplateRows:"1fr 80px", height:"100vh", fontFamily:"'Nunito Sans',system-ui,sans-serif" }}>

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

              <main className="overflow-y-auto" style={{gridRow:"1/2"}}>
                {page === "home"    && <HomePage    navigate={navigate} />}
                {page === "browse"  && <BrowsePage  />}
                {page === "library" && <LibraryPage navigate={navigate} />}
                {page === "upload"  && <UploadPage  />}
                {page === "artist"  && <ArtistPage  artistId={pageParams.artistId} navigate={navigate} />}
                {page === "profile" && <ProfilePage userId={pageParams.userId}      navigate={navigate} />}
              </main>

              <Player />
            </div>
          )
        }
      </PlayerProvider>
    </AuthProvider>
  );
}