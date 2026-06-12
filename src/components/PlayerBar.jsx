import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { trackBg, fmtDur } from "../lib/api";
import Spinner from "./Spinner";

export default function PlayerBar() {
  const {
    current,
    playing,
    buffering,
    progress,
    elapsed,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrev,
  } = usePlayer();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragVal, setDragVal] = useState(0);
  const barRef = useRef(null);

  // Reset liked state when track changes
  useEffect(() => {
    setLiked(false);
  }, [current?.id]);

  const handleLike = async () => {
    if (!user || !current) return;
    const next = !liked;
    setLiked(next);
    try {
      await apiFetch(`/tracks/${current.id}/like`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      setLiked(!next);
    }
  };

  // Seek bar: click or drag
  const getPct = (e) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const { left, width } = bar.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
  };
  const onBarMouseDown = (e) => {
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
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, seek]);

  const displayPct = dragging ? dragVal : progress;

  return (
    <div
      className="col-span-2 bg-zinc-900 border-t border-white/5 grid items-center px-6 gap-6"
      style={{ gridTemplateColumns: "280px 1fr 200px", height: 80 }}
    >
      {/* Track info */}
      <div className="flex items-center gap-3 min-w-0">
        {current ? (
          <>
            <div
              className={`w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0 ${trackBg(current)}`}
            >
              {buffering ? (
                <Spinner sm />
              ) : current.album?.coverUrl ? (
                <img
                  src={current.album?.coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : current.coverUrl ? (
                <img
                  src={current.coverUrl}
                  alt=""
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
              <p className="text-xs text-zinc-400 truncate">
                {current.artist?.name ?? current.artist}
              </p>
            </div>
            <button
              onClick={handleLike}
              className={`bg-transparent border-0 text-base cursor-pointer p-1 transition-colors flex-shrink-0 ${liked ? "text-pink-400" : "text-zinc-600 hover:text-pink-400"}`}
            >
              <i className="ti ti-heart" />
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-600">Double-click a track to play</p>
        )}
      </div>

      {/* Controls + seek */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          <button className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1">
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
            onClick={playNext}
            className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1 disabled:opacity-40"
            disabled={!current}
          >
            <i className="ti ti-player-skip-forward" />
          </button>
          <button className="bg-transparent border-0 text-zinc-500 hover:text-zinc-200 text-lg cursor-pointer p-1">
            <i className="ti ti-repeat" />
          </button>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-2.5 w-full">
          <span className="text-xs text-zinc-600 w-8 text-right tabular-nums">
            {fmtDur(elapsed)}
          </span>
          <div
            ref={barRef}
            className="flex-1 h-1 bg-zinc-700 rounded-full cursor-pointer group relative"
            onMouseDown={onBarMouseDown}
          >
            {/* Buffering shimmer */}
            {buffering && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-zinc-500 animate-pulse rounded-full" />
              </div>
            )}
            {/* Progress fill */}
            <div
              className="h-full rounded-full bg-emerald-500 group-hover:bg-yellow-400 transition-colors pointer-events-none"
              style={{ width: `${displayPct}%` }}
            />
            {/* Drag handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow"
              style={{ left: `calc(${displayPct}% - 6px)` }}
            />
          </div>
          <span className="text-xs text-zinc-600 w-8 tabular-nums">
            {fmtDur(duration || current?.duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2.5 justify-end">
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
