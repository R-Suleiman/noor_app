import { useEffect, useState } from "react";
import { MAQAM_OPTIONS } from "../constants/trackMetadata";
import { axiosClient, mediaUrl } from "../lib/api";
import Spinner from "./Spinner";

const GENRES = ["QASIDAS", "NASHEEDS", "DUFF", "INSTRUMENTAL", "MADRASSA", "OTHER"];
const LANGUAGES = ["ARABIC", "SWAHILI", "ENGLISH", "URDU", "OTHER"];

export default function TrackEditModal({ track, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    title: track.title || "",
    titleAr: track.titleAr || "",
    titleSw: track.titleSw || "",
    genre: track.genre || "QASIDAS",
    language: track.language || "ARABIC",
    duration: track.duration || 0,
    maqamat: track.maqamat || [],
    albumId: track.albumId || track.album?.id || "",
    lyrics: track.lyrics || "",
    lyricsAr: track.lyricsAr || "",
    isPublished: track.isPublished !== false,
  }));
  const [albums, setAlbums] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState(() => mediaUrl(track.coverUrl || track.album?.coverUrl));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const artistId = track.artistId || track.artist?.id;
    if (!artistId) return;
    axiosClient.get(`/artists/${artistId}/albums`)
      .then((response) => setAlbums(response.albums || []))
      .catch(() => setAlbums([]));
  }, [track.artistId, track.artist?.id]);

  useEffect(() => () => {
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleMaqam = (value) => setForm((current) => ({
    ...current,
    maqamat: current.maqamat.includes(value)
      ? current.maqamat.filter((maqam) => maqam !== value)
      : [...current.maqamat, value],
  }));

  const selectCover = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setRemoveCover(false);
    setCoverPreview(URL.createObjectURL(file));
  };

  const selectAudio = (event) => {
    const file = event.target.files?.[0];
    setAudioFile(file || null);
    setAudioDuration(null);
    if (!file) return;
    const element = new Audio();
    const objectUrl = URL.createObjectURL(file);
    element.src = objectUrl;
    element.onloadedmetadata = () => {
      const duration = Math.round(element.duration);
      setAudioDuration(duration);
      set("duration", duration);
      URL.revokeObjectURL(objectUrl);
    };
    element.onerror = () => URL.revokeObjectURL(objectUrl);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError("Track title is required.");
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("titleAr", form.titleAr.trim());
      payload.append("titleSw", form.titleSw.trim());
      payload.append("genre", form.genre);
      payload.append("language", form.language);
      payload.append("duration", String(form.duration));
      payload.append("maqamat", JSON.stringify(form.maqamat));
      payload.append("albumId", form.albumId);
      payload.append("lyrics", form.lyrics.trim());
      payload.append("lyricsAr", form.lyricsAr.trim());
      payload.append("isPublished", String(form.isPublished));
      payload.append("removeCover", String(removeCover));
      if (coverFile) payload.append("cover", coverFile);
      if (audioFile) payload.append("audio", audioFile);

      const response = await axiosClient.patch(`/tracks/${track.id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(response.track);
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Track details could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="track-edit-title" className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Complete track editor</p>
            <h2 id="track-edit-title" className="truncate text-lg font-bold text-white">{track.title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close editor" className="ml-3 h-10 w-10 shrink-0 rounded-full border-0 bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-40"><i className="ti ti-x text-xl" /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Track title
              <input value={form.title} onChange={(event) => set("title", event.target.value)} required maxLength={160} className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-100 outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Arabic title <span className="normal-case text-zinc-600">(optional)</span>
              <input value={form.titleAr} onChange={(event) => set("titleAr", event.target.value)} dir="rtl" className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Swahili title <span className="normal-case text-zinc-600">(optional)</span>
              <input value={form.titleSw} onChange={(event) => set("titleSw", event.target.value)} className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Genre
              <select value={form.genre} onChange={(event) => set("genre", event.target.value)} className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">{GENRES.map((value) => <option key={value}>{value}</option>)}</select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Language
              <select value={form.language} onChange={(event) => set("language", event.target.value)} className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">{LANGUAGES.map((value) => <option key={value}>{value}</option>)}</select>
            </label>
            <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Album / collection
              <select value={form.albumId} onChange={(event) => set("albumId", event.target.value)} className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
                <option value="">Independent release</option>
                {albums.map((album) => <option key={album.id} value={album.id}>{album.title}{album.releaseYear ? ` (${album.releaseYear})` : ""}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Duration in seconds
              <input type="number" min="0" value={form.duration} onChange={(event) => set("duration", event.target.value)} className="mt-2 block w-full rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
            </label>
          </section>

          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wider text-zinc-500">Maqām / sound modes <span className="normal-case text-zinc-600">(optional)</span></legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {MAQAM_OPTIONS.map((maqam) => {
                const selected = form.maqamat.includes(maqam.value);
                return <button key={maqam.value} type="button" aria-pressed={selected} onClick={() => toggleMaqam(maqam.value)} className={`rounded-full border px-3.5 py-2 text-xs font-semibold ${selected ? "border-purple-500 bg-purple-500/15 text-purple-300" : "border-white/5 bg-zinc-950 text-zinc-400"}`}>{selected && <i className="ti ti-check mr-1" />}{maqam.label}</button>;
              })}
            </div>
          </fieldset>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Lyrics / notes <span className="normal-case text-zinc-600">(optional)</span>
              <textarea value={form.lyrics} onChange={(event) => set("lyrics", event.target.value)} rows={6} className="mt-2 block w-full resize-y rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Arabic lyrics <span className="normal-case text-zinc-600">(optional)</span>
              <textarea value={form.lyricsAr} onChange={(event) => set("lyricsAr", event.target.value)} rows={6} dir="rtl" className="mt-2 block w-full resize-y rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none focus:border-emerald-500" />
            </label>
          </section>

          <section className="grid gap-4 rounded-2xl border border-white/5 bg-zinc-950/50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Cover artwork</p>
              {coverPreview && !removeCover && <img src={coverPreview} alt="Current track cover" className="mt-3 h-28 w-28 rounded-xl object-cover" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectCover} className="mt-3 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-zinc-200" />
              {(track.coverUrl || coverFile) && <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(""); setRemoveCover(true); }} className="mt-3 border-0 bg-transparent p-0 text-xs font-semibold text-red-400">Remove track cover</button>}
              {!track.coverUrl && track.album?.coverUrl && !coverFile && !removeCover && <p className="mt-2 text-xs text-zinc-600">Currently using the album cover.</p>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Audio recording</p>
              <p className="mt-2 text-xs leading-5 text-zinc-600">Leave empty to keep the existing audio. Selecting a file replaces it after a successful save.</p>
              <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac" onChange={selectAudio} className="mt-3 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-zinc-200" />
              {audioFile && <p className="mt-2 truncate text-xs text-emerald-400">{audioFile.name}{audioDuration !== null ? ` · ${audioDuration}s` : ""}</p>}
            </div>
          </section>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-zinc-950/50 p-4">
            <span><strong className="block text-sm text-zinc-200">Published</strong><span className="text-xs text-zinc-600">Visible in Noor’s public catalog</span></span>
            <input type="checkbox" checked={form.isPublished} onChange={(event) => set("isPublished", event.target.checked)} className="h-5 w-5 accent-emerald-500" />
          </label>
        </div>

        <footer className="flex shrink-0 gap-3 border-t border-white/5 bg-zinc-950 p-4 sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border-0 bg-zinc-800 px-5 py-3 text-sm font-bold text-zinc-300 disabled:opacity-40 sm:flex-none">Cancel</button>
          <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-0 bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 sm:flex-none">{saving ? <><Spinner sm /> Saving…</> : "Save all details"}</button>
        </footer>
      </form>
    </div>
  );
}
