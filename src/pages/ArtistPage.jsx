import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import TrackRow from "../components/TrackRow";
import { axiosClient, GENRE_BG } from "../lib/api";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import {MOCK_ARTISTS, MOCK_TRACKS} from "../data/musicData";

export default function ArtistPage({ artistId, navigate }) {
  const [artist,    setArtist]    = useState(null);
  const [tracks,    setTracks]    = useState([]);
  const [tab,       setTab]       = useState("tracks");
  const [following, setFollowing] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuth();
  const { play } = usePlayer();
const trackBg  = t => t.bg ?? GENRE_BG[t.genre] ?? "bg-zinc-700";
const fmtNum   = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n ?? 0);

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    Promise.all([axiosClient.get(`/artists/${artistId}`), axiosClient.get(`/artists/${artistId}/tracks`)])
      .then(([a,t]) => { setArtist(a.artist); setTracks(t.artist.tracks); })
      .catch(() => { setArtist(MOCK_ARTISTS.find(a => a.id === artistId) ?? MOCK_ARTISTS[0]); setTracks(MOCK_TRACKS.slice(0,4)); })
      .finally(() => setLoading(false));
  }, [artistId]);

  const handleFollow = async () => {
    if (!user) return;
    const next = !following; setFollowing(next);
    try { await axiosClient.post(`/users/${artist?.user?.id ?? artistId}/follow`, { method: next ? "POST" : "DELETE" }); }
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
