import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import TrackRow from "../components/TrackRow";
import { useAuth } from "../context/AuthContext";
import { axiosClient, mediaUrl } from "../lib/api";
import { useDialog } from "../context/DialogContext";

const TABS = [
  ["liked", "Liked Tracks", "ti-heart-filled"],
  ["history", "Recently Played", "ti-history"],
  ["playlists", "Playlists", "ti-playlist"],
  ["albums", "Saved Albums", "ti-album"],
  ["artists", "Following", "ti-users"],
];

const ENDPOINTS = {
  liked: "/users/me/liked",
  history: "/users/me/history",
  playlists: "/users/me/playlists",
  albums: "/users/me/saved-albums",
  artists: "/users/me/following",
};

export default function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, prompt } = useDialog();
  const [tab, setTab] = useState("liked");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosClient.get(ENDPOINTS[tab]);
      setData(response.tracks || response.playlists || response.albums || response.artists || []);
    } catch (requestError) {
      setError(requestError.message || "Could not load your library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // `tab` is the intentional reload boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.id]);

  const createPlaylist = async () => {
    const title = await prompt("Give your new collection a memorable name.", {
      title: "Create playlist",
      label: "Playlist name",
      confirmLabel: "Create playlist",
    });
    if (!title?.trim()) return;
    setCreating(true);
    try {
      const response = await axiosClient.post("/playlists", { title: title.trim() });
      if (tab === "playlists") setData((items) => [response.playlist, ...items]);
      else setTab("playlists");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  };

  const clearHistory = async () => {
    const approved = await confirm("This removes all items from your recently played list.", {
      title: "Clear listening history?",
      confirmLabel: "Clear history",
      danger: true,
    });
    if (!approved) return;
    await axiosClient.delete("/users/me/history");
    setData([]);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Avatar name={user?.role === "ADMIN" ? "NOOR" : user?.displayName} url={mediaUrl(user?.avatarUrl)} size="xl" />
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Your Library</h1>
          <p className="text-sm text-zinc-500">Saved listening, collections, and creators</p>
        </div>
        <div className="ml-auto flex gap-2">
          {tab === "history" && data.length > 0 && (
            <button onClick={clearHistory} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 border-0 cursor-pointer">
              Clear history
            </button>
          )}
          <button disabled={creating} onClick={createPlaylist} className="px-4 py-2 rounded-lg bg-emerald-600 text-white border-0 cursor-pointer disabled:opacity-50">
            <i className="ti ti-plus mr-1" /> New playlist
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zinc-800 mb-6 overflow-x-auto">
        {TABS.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap px-4 py-3 bg-transparent border-0 border-b-2 cursor-pointer ${tab === id ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500"}`}>
            <i className={`ti ${icon} mr-2`} />{label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-400 p-3">{error}</div>}
      {loading ? <div className="py-20 flex justify-center"><Spinner /></div> : (
        <>
          {(tab === "liked" || tab === "history") && (
            <div className="space-y-1">{data.map((track, index) => <TrackRow key={track.id} track={track} index={index} trackList={data} />)}</div>
          )}

          {tab === "playlists" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.map((playlist) => (
                <button key={playlist.id} onClick={() => navigate(`/playlists/${playlist.id}`)} className="text-left bg-zinc-900 border border-white/5 rounded-xl p-4 cursor-pointer text-zinc-100">
                  <div className="aspect-square rounded-lg bg-zinc-800 flex items-center justify-center mb-3"><i className="ti ti-playlist text-4xl text-zinc-600" /></div>
                  <strong className="block truncate">{playlist.title}</strong>
                  <span className="text-xs text-zinc-500">{playlist._count?.tracks ?? 0} tracks</span>
                </button>
              ))}
            </div>
          )}

          {tab === "albums" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.map((album) => (
                <button key={album.id} onClick={() => navigate(`/albums/${album.id}`)} className="text-left bg-zinc-900 border border-white/5 rounded-xl p-4 cursor-pointer text-zinc-100">
                  <div className="aspect-square rounded-lg bg-zinc-800 overflow-hidden mb-3">{album.coverUrl ? <img src={mediaUrl(album.coverUrl)} alt="" className="w-full h-full object-cover" /> : <i className="ti ti-album text-4xl text-zinc-600 flex h-full items-center justify-center" />}</div>
                  <strong className="block truncate">{album.title}</strong>
                  <span className="text-xs text-zinc-500">{album.artist?.name} · {album._count?.tracks ?? 0} tracks</span>
                </button>
              ))}
            </div>
          )}

          {tab === "artists" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.map((artist) => (
                <button key={artist.id} onClick={() => navigate(`/artist/${artist.id}`)} className="bg-zinc-900 border border-white/5 rounded-xl p-4 cursor-pointer text-zinc-100">
                  <Avatar name={artist.name} url={mediaUrl(artist.user?.avatarUrl)} size="xl" className="mx-auto mb-3" />
                  <span className="flex items-center justify-center gap-1">
                    <strong className="min-w-0 truncate">{artist.name}</strong>
                    {artist.isVerified && <VerifiedBadge showLabel={false} className="shrink-0" />}
                  </span>
                  <span className="text-xs text-zinc-500">{artist._count?.followers ?? 0} followers</span>
                </button>
              ))}
            </div>
          )}

          {!data.length && !error && <div className="py-20 text-center text-zinc-500">Nothing here yet.</div>}
        </>
      )}
    </div>
  );
}
