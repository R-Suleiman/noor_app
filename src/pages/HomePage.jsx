import { useEffect, useState } from "react";
import TrackRow from "../components/TrackRow";
import Avatar from "../components/Avatar";
import { usePlayer } from "../context/PlayerContext";
import { axiosClient, trackBg } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { current, playing, togglePlay, progress } = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const navigate = useNavigate()
  const API_BASE_URL = "http://localhost:3001";

  useEffect(() => {
    axiosClient
      .get("/tracks/trending")
      .then((res) => {
        setTracks(res.tracks || [])
      }
    )
      .catch(() => {});

    axiosClient
      .get("/artists")
      .then((res) => setArtists(res.artists || []))
      .catch(() => {});
  }, []);


  const handleStartListening = () => {
    if (tracks.length > 0) {
      // Pass the complete trending collection directly to initialize global playback queue state
      document.dispatchEvent(
        new CustomEvent("play-first", { detail: { tracks } }),
      );
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ─── LEFT COLUMN: DISCOVERY FLOW (Occupies 2 spans out of 3) ───────── */}
      <div className="lg:col-span-2">
        {/* Banner Area */}
        <div className="relative rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/50 border border-white/5 p-8 mb-10 overflow-hidden shadow-xl">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 pointer-events-none filter blur-xl" />
          <div className="absolute -bottom-10 right-32 w-36 h-36 rounded-full bg-yellow-500/5 pointer-events-none filter blur-xl" />

          <p className="text-xs font-semibold tracking-widest uppercase text-yellow-400/80 mb-2">
            Assalamu Alaykum
          </p>
          <h1
            className="text-4xl font-bold text-zinc-100 leading-snug mb-5 relative z-10"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Discover the voice
            <br />
            of devotion
          </h1>
          <button
            onClick={handleStartListening}
            className="relative z-10 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] border-0 cursor-pointer"
          >
            <i className="ti ti-player-play-filled" /> Start listening
          </button>
        </div>

        {/* Trending Tracks Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase font-bold text-zinc-400">
              Trending tracks
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} trackList={tracks} />
            ))}
          </div>
        </div>

        {/* Featured Artists Section */}
        <div>
          <p className="text-xs tracking-widest uppercase font-bold text-zinc-400 mb-4">
            Featured artists
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {artists.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate(`/artist/${a.id}`)}
                className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-200 group"
              >
                <div className="relative mb-4">
                  <Avatar name={a.name} url={`${API_BASE_URL}${a.avatarUrl}`} size="xl" />
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <i className="ti ti-eye text-white text-lg" />
                  </div>
                </div>
                <p className="text-sm font-bold text-zinc-100 truncate w-full group-hover:text-emerald-400 transition-colors">
                  {a.name}
                </p>
                {a.isMadrassa && (
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full mt-1.5 font-medium tracking-wide">
                    Madrassa
                  </span>
                )}
                <p className="text-xs text-zinc-500 mt-2 font-medium">
                  {a.tracksCount ?? 0} tracks ·{" "}
                  {a.followersCount ?? 0} followers
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: NOW PLAYING DETAIL SIDEBAR (Sticky Sidebar View) ─── */}
      <div className="lg:col-span-1">
        <div className="sticky top-8 bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 border border-white/5 rounded-2xl p-6 shadow-xl min-h-[450px] flex flex-col justify-between overflow-hidden">
          {current ? (
            <div className="flex flex-col h-full animate-[fadeIn_0.3s_ease-out]">
              {/* Context Block Heading */}
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Now Playing
                </p>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>

              {/* Enhanced Interactive Track Artwork Display */}
              <div
                className={`aspect-square w-full rounded-xl flex items-center justify-center shadow-lg relative group mb-5 overflow-hidden ${trackBg(current)}`}
              >
                {current.album?.coverUrl ? (
                  <img
                    src={current.album?.coverUrl}
                    alt={current.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : 
                current.coverUrl ? (
                  <img
                    src={current.coverUrl}
                    alt={current.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) :
                (
                  <i className="ti ti-music text-white/30 text-5xl animate-[pulse_2s_infinite]" />
                )}

                {/* Overlay Play/Pause Trigger */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center border-0 cursor-pointer shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <i
                      className={`ti ${playing ? "ti-player-pause-filled" : "ti-player-play-filled"} text-xl`}
                    />
                  </button>
                </div>
              </div>

              {/* Track Primary Metadata */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-zinc-100 truncate tracking-tight">
                  {current.title}
                </h3>
                <p className="text-sm text-zinc-400 truncate mt-0.5 font-medium">
                  {current.artist?.name ?? "Unknown Speaker"}
                </p>
              </div>

              {/* Mini Interactive Tracking Progress Bar Indicator */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-5 border border-white/5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Dynamic Context Description / Mini-Bio Sub-Block */}
              <div className="bg-zinc-800/40 border border-white/5 rounded-xl p-4 flex-grow flex flex-col justify-center">
                <p className="text-xs uppercase font-bold tracking-wider text-zinc-500 mb-1">
                  Speaker Meta Context
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {current.artist?.bio
                    ? current.artist.bio
                    : "This audio track belongs to verified collections listed across public streaming indexes on Noor App."}
                </p>
                {current.genre && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 max-w-max px-2.5 py-1 rounded-md">
                    <i className="ti ti-category" />
                    <span className="capitalize">
                      {current.genre.toLowerCase()} Category
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty Queue Placeholder Fallback View */
            <div className="flex flex-col items-center justify-center flex-grow text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-white/5 flex items-center justify-center mb-4 text-zinc-500">
                <i className="ti ti-disc text-3xl animate-[spin_8s_linear_infinite]" />
              </div>
              <h4 className="text-sm font-bold text-zinc-300">
                No Track Selected
              </h4>
              <p className="text-xs text-zinc-500 max-w-[200px] mt-1 leading-normal">
                Double-click any row item or choose an artist to spin up an
                audio streaming engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
