import { useState, useEffect } from "react";
import { axiosClient } from "../lib/api";
import Spinner from "./Spinner";

export default function AlbumManagementModal({ albumId, onClose, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [album, setAlbum] = useState(null);
  const [availableTracks, setAvailableTracks] = useState([]); // Loose unassigned tracks
  
  // Form elements
  const [editForm, setEditForm] = useState({ title: "", description: "", releaseYear: "" });
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [error, setError] = useState("");

  const fetchAlbumDetails = async () => {
    try {
      setLoading(true);
      // Fetch focused album metadata including its current tracks roster
      const res = await axiosClient.get(`/albums/${albumId}`);
      const data = res.data?.album || res.album || res.data;
      setAlbum(data);
      setEditForm({
        title: data.title || "",
        description: data.description || "",
        releaseYear: data.releaseYear || new Date().getFullYear()
      });

      // Also get available tracks to handle appends contextually
      const tracksRes = await axiosClient.get(`/upload/unassigned-tracks`);
      setAvailableTracks(tracksRes.tracks || []);
    } catch (err) {
      setError("Failed to sync structural data details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (albumId) fetchAlbumDetails(); }, [albumId]);

  const handleUpdateAlbum = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;

    setSaving(true);
    try {
      await axiosClient.patch(`/albums/${albumId}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        releaseYear: parseInt(editForm.releaseYear, 10)
      });
      fetchAlbumDetails();
      onRefresh();
    } catch (err) {
      setError("Failed to modify metadata configurations.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!window.confirm("CRITICAL: Deleting this album directory will not erase songs, but it unbinds them back to standalone singles. Proceed?")) return;
    
    try {
      setSaving(true);
      await axiosClient.delete(`/albums/${albumId}`);
      onRefresh();
      onClose();
    } catch (err) {
      setError("Failed to drop selected structural album folder.");
      setSaving(false);
    }
  };

  const handleAddTrack = async () => {
    if (!selectedTrackId) return;
    try {
      await axiosClient.patch(`/upload/track/${selectedTrackId}/assign-album`, { albumId });
      setSelectedTrackId("");
      fetchAlbumDetails();
      onRefresh();
    } catch (err) {
      setError("Failed to bind target media track.");
    }
  };

  const handleRemoveTrack = async (trackId) => {
    try {
      await axiosClient.patch(`/upload/track/${trackId}/assign-album`, { albumId: null });
      fetchAlbumDetails();
      onRefresh();
    } catch (err) {
      setError("Failed to drop track context safely.");
    }
  };

  if (!albumId) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/5 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-950">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Studio Album Hub</h3>
            <p className="text-[11px] text-zinc-500 truncate max-w-[280px] sm:max-w-xs">Configuring: {album?.title}</p>
          </div>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-zinc-400 hover:text-white text-lg">
            <i className="ti ti-x" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12"><Spinner /></div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
            {error && (
              <div className="bg-red-500/10 border border-red-500/10 text-red-400 p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}

            {/* Section A: Update Text Fields Info */}
            <form onSubmit={handleUpdateAlbum} className="space-y-3 bg-zinc-950/40 p-4 rounded-xl border border-white/5">
              <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Folder Metadata</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(v => ({ ...v, title: e.target.value }))}
                  placeholder="Album Title"
                  required
                  className="sm:col-span-2 bg-zinc-900 border border-white/5 px-3 py-2 rounded-lg text-zinc-200 outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  value={editForm.releaseYear}
                  onChange={(e) => setEditForm(v => ({ ...v, releaseYear: e.target.value }))}
                  placeholder="Release Year"
                  className="bg-zinc-900 border border-white/5 px-3 py-2 rounded-lg text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm(v => ({ ...v, description: e.target.value }))}
                placeholder="Album summary description notes..."
                className="w-full bg-zinc-900 border border-white/5 px-3 py-2 rounded-lg text-zinc-200 outline-none focus:border-emerald-500"
              />
              <div className="flex items-center justify-between pt-1">
                <button type="submit" disabled={saving} className="bg-emerald-600 text-white font-bold uppercase tracking-wider px-4 py-2 rounded-lg border-0 cursor-pointer hover:bg-emerald-500">
                  Save Configurations
                </button>
                <button type="button" onClick={handleDeleteAlbum} disabled={saving} className="bg-transparent border border-red-500/20 hover:bg-red-500/5 text-red-400 font-bold uppercase tracking-wider px-3 py-2 rounded-lg cursor-pointer">
                  Delete Album Container
                </button>
              </div>
            </form>

            {/* Section B: Inject Tracks Component Select Option */}
            <div className="space-y-2 bg-zinc-950/40 p-4 rounded-xl border border-white/5">
              <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Append Existing Loose Tracks</div>
              <div className="flex gap-2">
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/5 px-3 py-2 rounded-lg text-zinc-200 outline-none cursor-pointer"
                >
                  <option value="">-- Choose unassigned standalone song track --</option>
                  {availableTracks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.genre})</option>
                  ))}
                </select>
                <button type="button" onClick={handleAddTrack} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg font-bold border-0 cursor-pointer shrink-0">
                  Add Track
                </button>
              </div>
            </div>

            {/* Section C: Track Catalog Inventory Control Stream Map */}
            <div className="space-y-2">
              <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Current Enrolled Track Roster ({album?.tracks?.length || 0})</div>
              <div className="space-y-1.5">
                {album?.tracks?.map((track) => (
                  <div key={track.id} className="p-2.5 bg-zinc-950/50 hover:bg-zinc-950 rounded-xl border border-white/5 flex items-center justify-between group">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-semibold text-zinc-200 truncate">{track.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{track.genre} • {track.language}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(track.id)}
                      className="bg-transparent border-0 cursor-pointer text-zinc-500 hover:text-red-400 p-1.5 transition-colors rounded-md hover:bg-red-500/5 inline-flex items-center gap-1 font-semibold"
                      title="Evict track back to loose items catalogue"
                    >
                      <i className="ti ti-minus text-sm" /> Unbind
                    </button>
                  </div>
                ))}
                {(!album?.tracks || album.tracks.length === 0) && (
                  <p className="text-zinc-600 italic text-center py-6 border border-dashed border-white/5 rounded-xl">No active tracks nested inside this directory package node.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}