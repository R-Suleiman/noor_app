import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosClient, mediaUrl } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import TrackRow from "../components/TrackRow";
import AlbumManagementModal from "../components/AlbumManagementModal";

export default function AlbumPage() {
  const { albumId } = useParams();
  const { user } = useAuth();
  const { play, togglePlay, current, playing } = usePlayer();
  const [managingAlbumId, setManagingAlbumId] = useState(null);
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [album, setAlbum] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [saved, setSaved] = useState(false);


  const fetchAlbumData = async (signal) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axiosClient.get(`/albums/${albumId}`, { signal });
      if (signal.aborted) return;
      const albumData = res.album 
      setAlbum(albumData);
      setSaved(Boolean(albumData.savedByMe));

      // 2. Resolve ownership credentials conditionally
      setIsOwner(Boolean(user && albumData?.artist?.userId === user.id));
    } catch (err) {
      if (signal.aborted) return;
      console.error(err);
      setError("Failed to resolve studio album compilation details.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (albumId) fetchAlbumData(controller.signal);
    return () => controller.abort();
    // The request is intentionally restarted for album/viewer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, user?.id]);

  // Master action to trigger or toggle chronological playback across the whole container
  const handlePlayAlbumAll = () => {
    if (!album?.tracks || album.tracks.length === 0) return;

    const isCurrentTrackInAlbum = album.tracks.some(
      (t) => t.id === current?.id,
    );

    if (isCurrentTrackInAlbum) {
      togglePlay();
    } else {
      // Seed first track item alongside full context array to populate PlayerContext queue
      play(album.tracks[0], album.tracks);
    }
  };

  // Determine header layout context button state flags
  const isAlbumActiveAndPlaying =
    playing && album?.tracks?.some((t) => t.id === current?.id);

  const toggleSaved = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await axiosClient.put(`/albums/${album.id}/save`);
      else await axiosClient.delete(`/albums/${album.id}/save`);
    } catch {
      setSaved(!next);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner />
        <p className="text-zinc-500 text-xs tracking-wide font-medium animate-pulse">
          Syncing album archives...
        </p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xl mb-3">
          <i className="ti ti-alert-circle" />
        </div>
        <p className="text-zinc-200 text-sm font-bold">
          {error || "Album context not located."}
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          This material may have been deleted or moved by the directory
          administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6 text-xs">
      {/* Hero Cover Display Board */}
      <div className="flex flex-col md:flex-row gap-6 items-end border-b border-white/5 pb-8">
        <div className="w-44 h-44 sm:w-48 sm:h-48 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 shrink-0 relative group">
          {album.coverUrl ? (
            <img
              src={mediaUrl(album.coverUrl)}
              alt={album.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2 bg-gradient-to-b from-zinc-850 to-zinc-950">
              <i className="ti ti-disc text-5xl" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 min-w-0 w-full">
          <span className="bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-widest text-[9px] px-2.5 py-1 rounded-full border border-emerald-500/10">
            Studio Album Collection
          </span>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none truncate max-w-2xl py-1">
            {album.title}
          </h1>

          {album.description && (
            <p className="text-zinc-400 font-medium text-xs max-w-2xl leading-relaxed line-clamp-2">
              {album.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
            <span className="text-zinc-300 font-bold">
              {album.artist?.name || "Independent Speaker"}
            </span>
            <span className="text-zinc-600">•</span>
            <span>{album.releaseYear}</span>
            <span className="text-zinc-600">•</span>
            <span>{album.tracks?.length || 0} tracks nested</span>
          </div>

          {/* Action Grid Panel Layout */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {album.tracks && album.tracks.length > 0 && (
              <button
                onClick={handlePlayAlbumAll}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl border-0 cursor-pointer flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
              >
                <i
                  className={`ti ${isAlbumActiveAndPlaying ? "ti-player-pause-filled" : "ti-player-play-filled"} text-sm`}
                />
                {isAlbumActiveAndPlaying
                  ? "Pause Album Stream"
                  : "Play Album Collection"}
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setManagingAlbumId(album.id)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5 font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <i className="ti ti-settings text-sm" />
                Manage Album
              </button>
            )}
            <button
              onClick={toggleSaved}
              className={`border font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer ${saved ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-zinc-800 border-white/5 text-zinc-300"}`}
            >
              <i className={`ti ${saved ? "ti-bookmark-filled" : "ti-bookmark"} mr-1`} />
              {saved ? "Saved" : "Save album"}
            </button>
          </div>
        </div>
      </div>

      {managingAlbumId && (
        <AlbumManagementModal
          albumId={managingAlbumId}
          onClose={() => setManagingAlbumId(null)}
          onRefresh={() => {
            navigate(0);
          }}
        />
      )}

      {/* Track Listing Catalog Node Grid Section */}
      <div className="space-y-3">
        <div className="hidden md:grid grid-cols-[32px_48px_minmax(0,1fr)_120px_80px_64px] items-center gap-4 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <span className="text-center">#</span>
          <span>Cover</span>
          <span>Title details</span>
          <span>Genre</span>
          <span className="text-right">Engagement</span>
          <span className="text-right">Like</span>
        </div>

        <div className="space-y-1.5">
          {album.tracks?.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={{
                ...track,
                album: { coverUrl: album.coverUrl },
                artist: {...album.artist}
              }}
              index={idx}
              trackList={album.tracks}
            />
          ))}

          {(!album.tracks || album.tracks.length === 0) && (
            <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
              <i className="ti ti-music-off text-3xl text-zinc-700 block mb-2" />
              <p className="text-zinc-500 italic font-medium">
                No tracks are currently bundled inside this album node.
              </p>
              {isOwner && (
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Open the manager up above to map items down into this layout
                  directory.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
