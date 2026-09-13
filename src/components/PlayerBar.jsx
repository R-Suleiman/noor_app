import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { trackBg, fmtDur, mediaUrl } from "../lib/api";
import Spinner from "./Spinner";
import { useTrackLike } from "../hooks/useTrackLike";
import HeartIcon from "./HeartIcon";
import { useLocation, useNavigate } from "react-router-dom";
import VerifiedBadge from "./VerifiedBadge";

export default function PlayerBar() {
  const {
    current,
    playing,
    buffering,
    progress,
    elapsed,
    duration,
    playbackError,
    volume,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrev,
    shuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();
  const { liked, likesCount, toggleLike } = useTrackLike(current);
  const [dragging, setDragging] = useState(false);
  const [dragVal, setDragVal] = useState(0);
  const barRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Pointer events support mouse, pen, and touch with one interaction path.
  const getPct = (e) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
  };
  const onBarPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setDragVal(getPct(e));
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setDragVal(getPct(e));
    const onUp = (e) => {
      seek(getPct(e));
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, seek]);

  const displayPct = dragging ? dragVal : progress;

  if (!current) return null;

  return (
    <div
      className="relative row-start-2 md:col-span-2 bg-zinc-900 border-t border-white/5 flex sm:grid sm:grid-cols-[minmax(160px,280px)_1fr] md:grid-cols-[280px_1fr_200px] items-center px-3 sm:px-6 gap-3 sm:gap-6 h-20"
    >
      {/* Compact mobile player. The whole metadata area opens Now Playing. */}
      <button
        type="button"
        onClick={() => navigate("/now-playing", { state: { from: `${location.pathname}${location.search}` } })}
        className="sm:hidden min-w-0 flex-1 flex items-center gap-3 bg-transparent border-0 text-left p-0 cursor-pointer"
        aria-label={`Open Now Playing for ${current.title}`}
      >
        <div className={`w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${trackBg(current)}`}>
          {current.album?.coverUrl || current.coverUrl ? (
            <img
              src={mediaUrl(current.album?.coverUrl || current.coverUrl)}
              alt=""
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <i className="ti ti-music text-white/60" />
          )}
        </div>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-100 truncate">
            {current.title}
          </span>
          {playbackError ? (
            <span className="mt-0.5 block truncate text-xs text-amber-400">{playbackError}</span>
          ) : (
            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-zinc-400">
              <span className="truncate">{current.artist?.name ?? current.artist ?? "Unknown artist"}</span>
              {current.artist?.isVerified && <VerifiedBadge showLabel={false} className="shrink-0" />}
            </span>
          )}
        </span>
        <i className="ti ti-chevron-up text-zinc-500 text-lg" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="sm:hidden w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white border-0 cursor-pointer flex-shrink-0"
      >
        {buffering ? <Spinner sm /> : <i className={`ti ${playing ? "ti-player-pause" : "ti-player-play"}`} />}
      </button>

      <div className="sm:hidden absolute left-0 right-0 bottom-0 h-0.5 bg-zinc-800">
        <div className="h-full bg-emerald-500" style={{ width: `${displayPct}%` }} />
      </div>

      {/* Track info */}
      <div className="hidden sm:flex items-center gap-3 min-w-0">
        <div
          className={`w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0 ${trackBg(current)}`}
        >
          {buffering ? (
            <Spinner sm />
          ) : current.album?.coverUrl ? (
            <img
              src={mediaUrl(current.album?.coverUrl)}
              alt=""
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : current.coverUrl ? (
            <img
              src={mediaUrl(current.coverUrl)}
              alt=""
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <i className="ti ti-music text-white/60 text-sm" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100 truncate">
            {current.title}
          </p>
          <p className={`truncate text-xs ${playbackError ? "text-amber-400" : "text-zinc-400"}`}>
            {playbackError || current.artist?.name || current.artist}
          </p>
        </div>
        <button
          onClick={toggleLike}
          aria-label={liked ? "Unlike track" : "Like track"}
          title={liked ? "Unlike track" : "Like track"}
          className={`inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-1 transition-colors flex-shrink-0 ${liked ? "text-pink-400" : "text-zinc-600 hover:text-pink-400"}`}
        >
          <HeartIcon filled={liked} className="h-[18px] w-[18px]" />
          <span className="text-[10px] font-semibold tabular-nums">{likesCount}</span>
        </button>
      </div>

      {/* Controls + seek */}
      <div className="hidden sm:flex flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          <button onClick={toggleShuffle} title="Shuffle" className={`bg-transparent border-0 hover:text-zinc-200 text-lg cursor-pointer p-1 ${shuffle ? "text-emerald-400" : "text-zinc-500"}`}>
            <i className="ti ti-arrows-shuffle" />
          </button>
          <button
            onClick={playPrev}
            className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1 disabled:opacity-40"
            disabled={!current}
          >
            <i className="ti ti-player-skip-back" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!current}
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed flex items-center justify-center text-white border-0 cursor-pointer transition-colors text-base flex-shrink-0"
          >
            {buffering ? (
              <Spinner sm />
            ) : (
              <i
                className={`ti ${playing ? "ti-player-pause" : "ti-player-play"}`}
              />
            )}
          </button>
          <button
            onClick={() => playNext()}
            className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1 disabled:opacity-40"
            disabled={!current}
          >
            <i className="ti ti-player-skip-forward" />
          </button>
          <button onClick={cycleRepeat} title={`Repeat: ${repeatMode}`} className={`relative bg-transparent border-0 hover:text-zinc-200 text-lg cursor-pointer p-1 ${repeatMode !== "off" ? "text-emerald-400" : "text-zinc-500"}`}>
            <i className={`ti ${repeatMode === "one" ? "ti-repeat-once" : "ti-repeat"}`} />
          </button>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-2.5 w-full">
          <span className="text-xs text-zinc-600 w-8 text-right tabular-nums">
            {fmtDur(elapsed)}
          </span>
          <div
            ref={barRef}
            className="relative h-3 flex-1 touch-none cursor-pointer rounded-full bg-transparent before:absolute before:inset-x-0 before:top-1/2 before:h-1 before:-translate-y-1/2 before:rounded-full before:bg-zinc-700"
            onPointerDown={onBarPointerDown}
            role="slider"
            tabIndex={0}
            aria-label="Playback position"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(displayPct)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                seek(Math.max(0, Math.min(100, displayPct + (event.key === "ArrowRight" ? 5 : -5))));
              }
            }}
          >
            {/* Buffering shimmer */}
            {buffering && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-zinc-500 animate-pulse rounded-full" />
              </div>
            )}
            {/* Progress fill */}
            <div
              className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-emerald-500 transition-colors group-hover:bg-yellow-400"
              style={{ width: `${displayPct}%` }}
            />
            {/* Drag handle */}
            <div
              className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              style={{ left: `calc(${displayPct}% - 6px)` }}
            />
          </div>
          <span className="text-xs text-zinc-600 w-8 tabular-nums">
            {fmtDur(duration || current?.duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="hidden md:flex items-center gap-2.5 justify-end">
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.75)}
          className="bg-transparent border-0 text-zinc-500 hover:text-zinc-300 text-base cursor-pointer p-0.5 flex-shrink-0 transition-colors"
        >
          <i
            className={`ti ${volume === 0 ? "ti-volume-off" : volume < 0.4 ? "ti-volume" : "ti-volume-2"}`}
          />
        </button>
        <div
          className="w-20 h-1 bg-zinc-700 rounded-full cursor-pointer group relative"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setVolume((e.clientX - r.left) / r.width);
          }}
        >
          <div
            className="h-full rounded-full bg-zinc-400 group-hover:bg-zinc-200 transition-colors"
            style={{ width: `${volume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
