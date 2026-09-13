import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { axiosClient } from "../lib/api";

export default function AddToPlaylistButton({ track, showLabel = false, className = "" }) {
  const { user } = useAuth();
  const { alert: showAlert, prompt, choose } = useDialog();
  const [adding, setAdding] = useState(false);

  const addToPlaylist = async (event) => {
    event.stopPropagation();
    if (!user) {
      await showAlert("Please sign in to add this track to a playlist.", { title: "Sign in required" });
      return;
    }

    setAdding(true);
    try {
      let { playlists } = await axiosClient.get("/users/me/playlists");
      if (!playlists.length) {
        const title = await prompt("You need a playlist before adding this track.", {
          title: "Create your first playlist",
          label: "Playlist name",
          confirmLabel: "Create playlist",
        });
        if (!title?.trim()) return;
        const response = await axiosClient.post("/playlists", { title: title.trim() });
        playlists = [response.playlist];
      }

      const playlistId = await choose("Select the collection for this track.", {
        title: "Add to playlist",
        options: playlists.map((playlist) => ({
          value: playlist.id,
          label: playlist.title,
          meta: `${playlist._count?.tracks ?? 0} tracks`,
        })),
      });
      if (!playlistId) return;
      await axiosClient.put(`/playlists/${playlistId}/tracks/${track.id}`);
    } catch (error) {
      await showAlert(error.message || "Could not add track to playlist", { title: "Playlist update failed" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <button
      type="button"
      onClick={addToPlaylist}
      disabled={adding}
      title="Add to playlist"
      aria-label={`Add ${track.title} to playlist`}
      className={`inline-flex items-center justify-center gap-2 border-0 cursor-pointer disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      <i className={`ti ${adding ? "ti-loader-2 animate-spin" : "ti-playlist-add"}`} aria-hidden="true" />
      {showLabel && <span>{adding ? "Opening playlists…" : "Add to playlist"}</span>}
    </button>
  );
}
