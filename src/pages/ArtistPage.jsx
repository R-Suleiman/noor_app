import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import TrackRow from "../components/TrackRow";
import Spinner from "../components/Spinner";
import { axiosClient, GENRE_BG } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";

export default function ArtistPage() {
  const { artistId } = useParams();
  const { user } = useAuth();
  const { play } = usePlayer();

  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [tab, setTab] = useState("tracks");
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = "http://localhost:3001";

  const trackBg = (t) => t?.bg ?? GENRE_BG[t?.genre] ?? "bg-zinc-800";
  const fmtNum = (n) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0);

  useEffect(() => {
    const targetId = artistId || "me";
    setLoading(true);

    Promise.all([
      axiosClient.get(`/artists/${targetId}`),
      axiosClient.get(`/artists/${targetId}/tracks`),
    ])
      .then(([artistRes, tracksRes]) => {
        const fetchedArtist = artistRes.data?.artist || artistRes.artist;
        const fetchedTracks = tracksRes.data?.tracks || tracksRes.tracks || [];

        setArtist(fetchedArtist);
        setTracks(fetchedTracks);

        if (fetchedArtist) {
          setFollowing(fetchedArtist.isFollowing || false);
        }
      })
      .catch((err) => {
        console.error(
          "Failed to compile real artist collections payload maps:",
          err,
        );
      })
      .finally(() => setLoading(false));
  }, [artistId, user]);

  const handleFollow = async () => {
    if (!user) return;
    const next = !following;
    setFollowing(next);
    try {
      await axiosClient.post(`/users/${artist?.userId || artist?.id}/follow`);
      setArtist((prev) => ({
        ...prev,
        _count: {
          ...prev._count,
          followers: (prev._count?.followers || 0) + (next ? 1 : -1),
        },
      }));
    } catch {
      setFollowing(!next);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <i className="ti ti-alert-circle text-3xl mb-2 text-zinc-600 block" />
        Artist profile context could not be resolved.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      {/* ─── HERO BANNER COVER BLOCK ──────────────────────────────── */}
      <div
        className={`relative h-80 ${trackBg(tracks[0])} flex items-end rounded-2xl overflow-hidden shadow-xl border border-white/5`}
      >
        {artist.coverUrl && (
          <img
            src={`${API_BASE_URL}${artist.coverUrl}`}
            alt="Cover background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6 p-8 w-full">
          {/* Avatar Frame */}
          <div className="relative flex-shrink-0">
            <Avatar
              name={artist.name}
              url={`${API_BASE_URL}${artist.avatarUrl}`}
              size="xl"
              className="ring-4 ring-zinc-950 shadow-2xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {artist.isMadrassa && (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                  Madrassa / Group
                </span>
              )}
              {artist.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-medium">
                  <i className="ti ti-rosette-discount-check" /> Verified
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold text-white truncate tracking-tight drop-shadow-sm mb-2">
              {artist.name}
            </h1>

            <p className="text-zinc-300 text-sm font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{artist._count?.tracks ?? tracks.length} tracks</span>
              <span className="text-zinc-600">•</span>
              <span>{fmtNum(artist._count?.followers || 0)} followers</span>
              {artist.location && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="inline-flex items-center gap-1 text-zinc-400">
                    <i className="ti ti-map-pin" /> {artist.location}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end flex-shrink-0 mt-4 md:mt-0">
            {tracks.length > 0 && (
              <button
                onClick={() => play(tracks[0], tracks)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-full border-0 cursor-pointer transition-all shadow-lg shadow-emerald-950/20 active:scale-95"
              >
                <i className="ti ti-player-play-fill text-base" /> Play
                Discography
              </button>
            )}

            {user && user.id !== artist.userId && (
              <button
                onClick={handleFollow}
                className={`px-6 py-3 text-sm font-semibold rounded-full border cursor-pointer transition-all ${
                  following
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                    : "border-white/20 text-zinc-200 bg-transparent hover:border-white/40 hover:bg-white/5"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONTENT TABS & BODY LAYER ────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Pane */}
        <div className="lg:col-span-2">
          <div className="flex gap-1 border-b border-white/5 mb-6">
            {[
              ["tracks", `Tracks (${tracks.length})`],
              ["albums", `Albums (${artist.albums?.length || 0})`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-3 text-sm font-medium bg-transparent border-0 border-b-2 -mb-px cursor-pointer transition-colors ${
                  tab === id
                    ? "text-emerald-400 border-emerald-500"
                    : "text-zinc-400 border-transparent hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "tracks" && (
            <div className="flex flex-col gap-1">
              {tracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} />
              ))}
              {!tracks.length && (
                <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-zinc-900/20">
                  <i className="ti ti-music-off text-2xl text-zinc-600 mb-1 block" />
                  <p className="text-zinc-500 text-sm">
                    No tracks uploaded yet
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "albums" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(artist.albums ?? []).map((al) => (
                <div
                  key={al.id}
                  className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 cursor-pointer hover:bg-zinc-900/80 transition-all group"
                >
                  <div className="w-full aspect-square rounded-lg mb-3 bg-zinc-800 flex items-center justify-center overflow-hidden relative border border-white/5">
                    {al.coverUrl ? (
                      <img
                        src={al.coverUrl}
                        alt={al.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <i className="ti ti-disc text-zinc-600 text-4xl group-hover:rotate-45 transition-transform" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">
                    {al.title}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {al.releaseYear ?? "—"} · {al._count?.tracks ?? 0} tracks
                  </p>
                </div>
              ))}
              {!artist.albums?.length && (
                <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-zinc-900/20 col-span-full">
                  <i className="ti ti-folder-off text-2xl text-zinc-600 mb-1 block" />
                  <p className="text-zinc-500 text-sm">
                    No digital albums listed yet
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Sidebar Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
              Biography
            </h3>
            {artist.bio ? (
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                {artist.bio}
              </p>
            ) : (
              <p className="text-zinc-600 text-sm italic">
                No history notes saved yet.
              </p>
            )}

            {artist.website && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Links
                </h4>
                <a
                  href={
                    artist.website.startsWith("http")
                      ? artist.website
                      : `https://${artist.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm no-underline transition-colors"
                >
                  <i className="ti ti-world" /> Official Website{" "}
                  <i className="ti ti-external-link text-xs" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}