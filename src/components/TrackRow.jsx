import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { axiosClient, trackBg } from "../lib/api";

export default function TrackRow({ track, index, liked: likedProp, trackList = [] }) {
  const { play, togglePlay, current, playing } = usePlayer();
  const { user } = useAuth();
  const [liked, setLiked] = useState(likedProp ?? false);
  
  // Sync internal state with external updates from parent components
  useEffect(() => {
    setLiked(likedProp ?? false);
  }, [likedProp]);

  const active = current?.id === track.id;

  const handleRowAction = () => {
    if (active) {
      togglePlay();
    } else {
      // Pass both the chosen track and the contextual tracklist array to populate the queue
      play(track, trackList);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation(); // Prevent trigger from firing row selection actions
    if (!user) {
      alert("Please sign in to save this audio track to your library.");
      return;
    }

    const previousState = liked;
    setLiked(!previousState);

    try {
      if (!previousState) {
        await axiosClient.post(`/tracks/${track.id}/like`);
      } else {
        await axiosClient.delete(`/tracks/${track.id}/like`);
      }
    } catch (err) {
      console.error("Failed to update track like status:", err);
      // Revert state if the API request fails
      setLiked(previousState);
    }
  };

  return (
    <div 
      onDoubleClick={handleRowAction}
      className={`group grid items-center gap-4 px-4 py-2 rounded-xl cursor-pointer transition-colors select-none ${
        active ? "bg-emerald-500/10 border border-emerald-500/10" : "hover:bg-zinc-800/50 border border-transparent"
      }`}
      style={{ gridTemplateColumns: "32px 48px 1fr 140px 80px 32px" }}
    >
      {/* Play Controls Index Column */}
      <div className="relative flex items-center justify-center w-8 h-8">
        <span className={`text-sm font-medium transition-opacity group-hover:opacity-0 ${active ? "text-emerald-400" : "text-zinc-500"}`}>
          {active && playing ? (
            <div className="flex items-end gap-0.5 h-3">
              <div className="w-0.5 bg-emerald-400 animate-[pulse_1s_infinite_alternate]" style={{ animationDelay: "0.1s" }} />
              <div className="w-0.5 h-full bg-emerald-400 animate-[pulse_1s_infinite_alternate]" style={{ animationDelay: "0.3s" }} />
              <div className="w-0.5 h-2 bg-emerald-400 animate-[pulse_1s_infinite_alternate]" style={{ animationDelay: "0.5s" }} />
            </div>
          ) : (
            index + 1
          )}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); handleRowAction(); }} 
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 border-0 text-zinc-100 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-md text-xs p-0"
        >
          <i className={`ti ${active && playing ? "ti-player-pause" : "ti-player-play"} text-zinc-100`} />
        </button>
      </div>

      {/* Album Artwork Wrapper Container */}
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden ${trackBg(track)}`}>
        {track.album?.coverUrl ? (
          <img src={track.album.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <i className="ti ti-music text-white/50 text-base" />
        )}
      </div>

      {/* Core Profile Descriptor Column */}
      <div className="min-w-0">
        <p className={`text-sm font-semibold truncate ${active ? "text-emerald-400" : "text-zinc-100"}`}>
          {track.title}
        </p>
        <p className="text-xs text-zinc-400 truncate mt-0.5 hover:text-zinc-300 transition-colors">
          {track.artist?.name ?? "Unknown Speaker"}
        </p>
      </div>

      {/* Genre Tag Field */}
      <span className="text-xs text-zinc-400 truncate tracking-wide bg-zinc-800 px-2.5 py-1 rounded-md max-w-max border border-white/5 font-medium capitalize">
        {track.genre ? track.genre.toLowerCase() : "Audio"}
      </span>

      {/* Play Counter Output String Formatting */}
      <span className="text-xs text-zinc-400 text-right font-mono tabular-nums">
        {track.playCount 
          ? (track.playCount >= 1000 
              ? `${(track.playCount / 1000).toFixed(1)}k` 
              : track.playCount) 
          : "0"} plays
      </span>

      {/* Reactive Favorite Activation Toggle Button */}
      <button 
        onClick={handleLike} 
        className={`bg-transparent border-0 cursor-pointer p-1 text-lg transition-all transform hover:scale-110 duration-150 ${
          liked ? "text-rose-500" : "text-zinc-500 hover:text-rose-400"
        }`}
      >
        <i className={`ti ${liked ? "ti-heart-filled" : "ti-heart"}`} />
      </button>
    </div>
  );
}