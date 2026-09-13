import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import HeartIcon from "../components/HeartIcon";
import Spinner from "../components/Spinner";
import { usePlayer } from "../context/PlayerContext";
import { useTrackLike } from "../hooks/useTrackLike";
import { fmtDur, fmtNum, mediaUrl, trackBg } from "../lib/api";
import VerifiedBadge from "../components/VerifiedBadge";
import { maqamLabel } from "../constants/trackMetadata";
import { useDialog } from "../context/DialogContext";

export default function NowPlayingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alert: showAlert } = useDialog();
  const closeNowPlaying = () => navigate(location.state?.from || "/");
  const {
    current,
    playing,
    buffering,
    progress,
    elapsed,
    duration,
    playbackError,
    togglePlay,
    seek,
    playNext,
    playPrev,
    shuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();
  const { liked, likesCount, toggleLike } = useTrackLike(current, { refresh: true });

  if (!current) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 mb-5">
          <i className="ti ti-music-off text-3xl" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100">Nothing is playing</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-xs">Choose a track and its details and controls will appear here.</p>
        <button onClick={() => navigate("/browse")} className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-xl px-5 py-2.5 font-semibold cursor-pointer">
          Browse tracks
        </button>
      </div>
    );
  }

  const coverUrl = current.album?.coverUrl || current.coverUrl;
  const artist = typeof current.artist === "object" ? current.artist : null;
  const artistName = artist?.name || current.artist || "Unknown artist";
  const artistId = artist?.id || current.artistId;
  const shareTrack = async () => {
    const url = `${window.location.origin}/tracks/${current.id}`;
    const shareData = { title: `${current.title} — Noor`, text: `Listen to ${current.title} by ${artistName} on Noor.`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        await showAlert("The track link was copied to your clipboard.", { title: "Ready to share" });
      }
    } catch (error) {
      if (error.name !== "AbortError") await showAlert("The track link could not be shared on this device.", { title: "Sharing unavailable" });
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-950 px-5 py-5 sm:px-8 sm:py-8">
      <div className="max-w-xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <button onClick={closeNowPlaying} aria-label="Close Now Playing" className="w-10 h-10 rounded-full bg-zinc-900/80 border border-white/5 text-zinc-200 cursor-pointer">
            <i className="ti ti-chevron-down text-xl" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-400 font-bold">Now Playing</p>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-48">{current.album?.title || "Noor Audio"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={shareTrack} aria-label="Share track" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-zinc-900/80 text-zinc-400">
              <i className="ti ti-share-3 text-lg" aria-hidden="true" />
            </button>
            <button onClick={toggleLike} aria-label={liked ? "Unlike track" : "Like track"} className={`w-10 h-10 rounded-full bg-zinc-900/80 border border-white/5 cursor-pointer inline-flex items-center justify-center ${liked ? "text-rose-400" : "text-zinc-400"}`}>
              <HeartIcon filled={liked} className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className={`aspect-square w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/40 flex items-center justify-center ${trackBg(current)}`}>
          {coverUrl ? (
            <img src={mediaUrl(coverUrl)} alt={`${current.title} cover`} className="w-full h-full object-cover" />
          ) : (
            <i className="ti ti-music text-7xl text-white/35" />
          )}
        </div>

        <section className="mt-7 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-zinc-50 truncate">{current.title}</h1>
            <button
              type="button"
              disabled={!artistId}
              onClick={() => artistId && navigate(`/artist/${artistId}`)}
              className="mt-1 inline-flex items-center gap-1 p-0 bg-transparent border-0 text-zinc-400 hover:text-emerald-400 disabled:hover:text-zinc-400 text-sm cursor-pointer disabled:cursor-default"
            >
              {artistName}
              {artist?.isVerified && <VerifiedBadge showLabel={false} />}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-3 pt-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1" title={`${current.playCount ?? 0} plays`}>
              <i className="ti ti-headphones" /> {fmtNum(current.playCount)}
            </span>
            <span className="inline-flex items-center gap-1" title={`${likesCount} likes`}>
              <HeartIcon filled={liked} className="w-3.5 h-3.5" /> {fmtNum(likesCount)}
            </span>
          </div>
        </section>

        {current.maqamat?.length > 0 && (
          <section className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Maqām / sound modes</p>
            <div className="flex flex-wrap gap-2">
              {current.maqamat.map((maqam) => (
                <span key={maqam} className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                  {maqamLabel(maqam)}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          {playbackError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-200" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />{playbackError}
            </div>
          )}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={Number.isFinite(progress) ? progress : 0}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Playback position"
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-500 tabular-nums mt-1">
            <span>{fmtDur(elapsed)}</span>
            <span>{fmtDur(duration || current.duration)}</span>
          </div>
        </section>

        <section className="mt-5 flex items-center justify-between px-2">
          <button onClick={toggleShuffle} aria-label="Toggle shuffle" className={`w-10 h-10 bg-transparent border-0 cursor-pointer text-xl ${shuffle ? "text-emerald-400" : "text-zinc-500"}`}>
            <i className="ti ti-arrows-shuffle" />
          </button>
          <button onClick={playPrev} aria-label="Previous track" className="w-12 h-12 bg-transparent border-0 text-zinc-100 cursor-pointer text-3xl">
            <i className="ti ti-player-skip-back" />
          </button>
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 border-0 text-white cursor-pointer text-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center">
            {buffering ? <Spinner /> : <i className={`ti ${playing ? "ti-player-pause" : "ti-player-play"}`} />}
          </button>
          <button onClick={() => playNext()} aria-label="Next track" className="w-12 h-12 bg-transparent border-0 text-zinc-100 cursor-pointer text-3xl">
            <i className="ti ti-player-skip-forward" />
          </button>
          <button onClick={cycleRepeat} aria-label={`Repeat ${repeatMode}`} className={`w-10 h-10 bg-transparent border-0 cursor-pointer text-xl ${repeatMode !== "off" ? "text-emerald-400" : "text-zinc-500"}`}>
            <i className={`ti ${repeatMode === "one" ? "ti-repeat-once" : "ti-repeat"}`} />
          </button>
        </section>

        <section className="mt-9 bg-zinc-900/75 border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-3">About the artist</p>
          <button
            type="button"
            disabled={!artistId}
            onClick={() => artistId && navigate(`/artist/${artistId}`)}
            className="w-full flex items-center gap-3 text-left bg-transparent border-0 p-0 cursor-pointer disabled:cursor-default"
          >
            <Avatar name={artistName} url={mediaUrl(artist?.avatarUrl)} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-100 truncate">{artistName}</span>
              <span className="block text-xs text-zinc-500 mt-0.5 line-clamp-2">
                {artist?.bio || `Listen to more audio from ${artistName} on Noor.`}
              </span>
            </span>
            {artistId && <i className="ti ti-chevron-right text-zinc-600" />}
          </button>
        </section>
      </div>
    </div>
  );
}
