import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../components/Spinner";
import TrackRow from "../components/TrackRow";
import { axiosClient } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useDialog } from "../context/DialogContext";

export default function PlaylistPage() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { play } = usePlayer();
  const { confirm, prompt } = useDialog();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/playlists/${playlistId}`);
      setPlaylist(response.playlist);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId]);

  const removeTrack = async (trackId) => {
    await axiosClient.delete(`/playlists/${playlistId}/tracks/${trackId}`);
    setPlaylist((value) => ({ ...value, tracks: value.tracks.filter((track) => track.id !== trackId) }));
  };

  const deletePlaylist = async () => {
    const approved = await confirm("The playlist will be removed. Its tracks will remain in Noor.", {
      title: "Delete playlist?",
      confirmLabel: "Delete playlist",
      danger: true,
    });
    if (!approved) return;
    await axiosClient.delete(`/playlists/${playlistId}`);
    navigate("/library");
  };

  const editPlaylist = async () => {
    const title = await prompt("Rename this collection.", {
      title: "Edit playlist",
      label: "Playlist name",
      initialValue: playlist.title,
      confirmLabel: "Save name",
    });
    if (!title?.trim()) return;
    const response = await axiosClient.patch(`/playlists/${playlistId}`, { title: title.trim() });
    setPlaylist((current) => ({ ...current, ...response.playlist }));
  };

  const togglePrivacy = async () => {
    const response = await axiosClient.patch(`/playlists/${playlistId}`, { isPublic: !playlist.isPublic });
    setPlaylist((current) => ({ ...current, ...response.playlist }));
  };

  const moveTrack = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= playlist.tracks.length) return;
    const tracks = [...playlist.tracks];
    [tracks[index], tracks[nextIndex]] = [tracks[nextIndex], tracks[index]];
    setPlaylist((current) => ({ ...current, tracks }));
    try {
      await axiosClient.patch(`/playlists/${playlistId}/tracks/order`, { trackIds: tracks.map((track) => track.id) });
    } catch (requestError) {
      setError(requestError.message);
      load();
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;
  if (error || !playlist) return <div className="p-8 text-red-400">{error || "Playlist not found"}</div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-end gap-5 mb-8">
        <div className="w-36 h-36 rounded-xl bg-zinc-800 flex items-center justify-center"><i className="ti ti-playlist text-5xl text-zinc-600" /></div>
        <div>
          <span className="text-xs uppercase text-zinc-500">Playlist</span>
          <h1 className="text-4xl font-bold text-white">{playlist.title}</h1>
          <p className="text-sm text-zinc-500">By {playlist.user.displayName} · {playlist.tracks.length} tracks</p>
          <div className="flex gap-2 mt-4">
            {!!playlist.tracks.length && <button onClick={() => play(playlist.tracks[0], playlist.tracks)} className="bg-emerald-600 text-white rounded-full px-5 py-2 border-0 cursor-pointer">Play</button>}
            {playlist.isOwner && <button onClick={editPlaylist} className="bg-zinc-800 text-zinc-200 rounded-full px-5 py-2 border-0 cursor-pointer">Edit</button>}
            {playlist.isOwner && <button onClick={togglePrivacy} className="bg-zinc-800 text-zinc-200 rounded-full px-5 py-2 border-0 cursor-pointer">{playlist.isPublic ? "Make private" : "Make public"}</button>}
            {playlist.isOwner && <button onClick={deletePlaylist} className="bg-zinc-800 text-red-400 rounded-full px-5 py-2 border-0 cursor-pointer">Delete</button>}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {playlist.tracks.map((track, index) => (
          <div key={track.id} className="flex items-center gap-2">
            <div className="flex-1"><TrackRow track={track} index={index} trackList={playlist.tracks} /></div>
            {playlist.isOwner && <div className="flex"><button onClick={() => moveTrack(index, -1)} disabled={index === 0} className="text-zinc-500 bg-transparent border-0 cursor-pointer disabled:opacity-20"><i className="ti ti-arrow-up" /></button><button onClick={() => moveTrack(index, 1)} disabled={index === playlist.tracks.length - 1} className="text-zinc-500 bg-transparent border-0 cursor-pointer disabled:opacity-20"><i className="ti ti-arrow-down" /></button><button onClick={() => removeTrack(track.id)} className="text-zinc-500 hover:text-red-400 bg-transparent border-0 cursor-pointer"><i className="ti ti-trash" /></button></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
