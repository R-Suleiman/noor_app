import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { mediaUrl, trackBg } from "../lib/api";
import { useTrackLike } from "../hooks/useTrackLike";
import { useDialog } from "../context/DialogContext";
import HeartIcon from "./HeartIcon";
import VerifiedBadge from "./VerifiedBadge";
import AddToPlaylistButton from "./AddToPlaylistButton";
import MarqueeText from "./MarqueeText";

export default function TrackRow({
  track,
  index,
  liked: likedProp,
  trackList = [],
  playbackContext = null,
}) {
  const { play, togglePlay, current, playing, updatePlaybackContext } = usePlayer();
  const { user } = useAuth();
  const { alert: showAlert } = useDialog();
  const { liked, likesCount, toggleLike } = useTrackLike({
    ...track,
    likedByMe: likedProp ?? track.likedByMe,
  });

  const active = current?.id === track.id;

  const handleRowAction = () => {
    if (active) {
      if (playbackContext) updatePlaybackContext(playbackContext);
      togglePlay();
    } else {
      // Pass both the chosen track and the contextual tracklist array to populate the queue
      play(track, trackList, { context: playbackContext });
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation(); // Prevent trigger from firing row selection actions
    if (!user) {
      showAlert("Please sign in to save this audio track to your library.", { title: "Sign in required" });
      return;
    }

    await toggleLike();
  };

  return (
    <div
      onClick={handleRowAction}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          event.preventDefault();
          handleRowAction();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${active && playing ? "Pause" : "Play"} ${track.title} by ${track.artist?.name ?? "Unknown Speaker"}`}
      className={`group grid grid-cols-[32px_48px_minmax(0,1fr)_64px] md:grid-cols-[32px_48px_minmax(0,1fr)_120px_80px_64px] items-center gap-2 md:gap-4 px-2 md:px-4 py-2 rounded-xl cursor-pointer transition-colors select-none ${
        active
          ? "bg-emerald-500/10 border border-emerald-500/10"
          : "hover:bg-zinc-800/50 border border-transparent"
      }`}
    >
      {/* Play Controls Index Column */}
      <div className="relative flex items-center justify-center w-8 h-8">
        <span
          className={`text-sm font-medium transition-opacity group-hover:opacity-0 ${active ? "text-emerald-400" : "text-zinc-500"}`}
        >
          {active && playing ? (
            <div className="flex items-end gap-0.5 h-3">
              <div
                className="w-0.5 bg-emerald-400 animate-[pulse_1s_infinite_alternate]"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-0.5 h-full bg-emerald-400 animate-[pulse_1s_infinite_alternate]"
                style={{ animationDelay: "0.3s" }}
              />
              <div
                className="w-0.5 h-2 bg-emerald-400 animate-[pulse_1s_infinite_alternate]"
                style={{ animationDelay: "0.5s" }}
              />
            </div>
          ) : (
            index + 1
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRowAction();
          }}
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 border-0 text-zinc-100 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-md text-xs p-0"
          aria-label={`${active && playing ? "Pause" : "Play"} ${track.title}`}
        >
          <i
            className={`ti ${active && playing ? "ti-player-pause" : "ti-player-play"} text-zinc-100`}
          />
        </button>
      </div>

      {/* Album Artwork Wrapper Container */}
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden ${trackBg(track)}`}
      >
        {track.album?.coverUrl ? (
          <img
            src={mediaUrl(track.album?.coverUrl)}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : track.coverUrl ? (
          <img
            src={mediaUrl(track.coverUrl)}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <i className="ti ti-music text-white/50 text-base" />
        )}
      </div>

      {/* Core Profile Descriptor Column */}
      <div className="min-w-0">
        <MarqueeText
          text={track.title}
          className={`text-sm font-semibold ${active ? "text-emerald-400" : "text-zinc-100"}`}
        />
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-300">
          <span className="truncate">{track.artist?.name ?? "Unknown Speaker"}</span>
          {track.artist?.isVerified && <VerifiedBadge showLabel={false} className="shrink-0" />}
        </p>
      </div>

      {/* Genre Tag Field */}
      <span className="hidden md:block text-xs text-zinc-400 truncate tracking-wide bg-zinc-800 px-2.5 py-1 rounded-md max-w-max border border-white/5 font-medium capitalize">
        {track.genre ? track.genre.toLowerCase() : "Audio"}
      </span>

      {/* Play Counter Output String Formatting */}
      <span className="hidden md:block text-xs text-zinc-400 text-right font-mono tabular-nums">
        {track.playCount
          ? track.playCount >= 1000
            ? `${(track.playCount / 1000).toFixed(1)}k`
            : track.playCount
          : "0"}{" "}
        plays
      </span>

      {/* Reactive Favorite Activation Toggle Button */}
      <div className="flex items-center justify-end gap-1">
        <AddToPlaylistButton track={track} className="bg-transparent p-1 text-base text-zinc-500 hover:text-emerald-400" />
        <button
          onClick={handleLike}
          aria-label={liked ? "Unlike track" : "Like track"}
          title={liked ? "Unlike track" : "Like track"}
          className={`inline-flex min-w-9 items-center justify-end gap-1 bg-transparent border-0 cursor-pointer p-1 transition-all transform hover:scale-105 duration-150 ${liked ? "text-rose-500" : "text-zinc-500 hover:text-rose-400"}`}
        >
          <HeartIcon filled={liked} className="h-[18px] w-[18px] shrink-0" />
          <span className="min-w-3 text-right text-[10px] font-semibold tabular-nums">{likesCount}</span>
        </button>
      </div>
    </div>
  );
}
