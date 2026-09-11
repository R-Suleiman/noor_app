import { useEffect, useMemo, useState } from "react";
import Spinner from "../components/Spinner";
import VerifiedBadge from "../components/VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { axiosClient, fmtDur, fmtNum } from "../lib/api";

const TABS = [
  { id: "overview", label: "Overview", icon: "ti-layout-dashboard" },
  { id: "users", label: "Accounts", icon: "ti-users" },
  { id: "artists", label: "Artists", icon: "ti-microphone-2" },
  { id: "tracks", label: "Tracks", icon: "ti-music" },
];
const ROLES = ["LISTENER", "ARTIST", "ADMIN"];
const GENRES = ["QASIDAS", "NASHEEDS", "DUFF", "INSTRUMENTAL", "MADRASSA", "OTHER"];
const LANGUAGES = ["ARABIC", "SWAHILI", "ENGLISH", "URDU", "OTHER"];

const statusPill = (active) => active
  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  : "bg-red-500/10 text-red-400 border-red-500/20";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { alert: showAlert, confirm } = useDialog();
  const [data, setData] = useState({ users: [], artists: [], tracks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [editingTrack, setEditingTrack] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await axiosClient.get("/admin/overview"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (key, action) => {
    setBusy(key);
    try {
      await action();
    } catch (requestError) {
      await showAlert(requestError.message, { title: "Administration action failed" });
    } finally {
      setBusy("");
    }
  };

  const patchArtist = (artist) => runAction(`artist-${artist.id}`, async () => {
    const next = !artist.isVerified;
    await axiosClient.patch(`/admin/artists/${artist.id}`, { isVerified: next });
    setData((current) => ({
      ...current,
      artists: current.artists.map((item) => item.id === artist.id ? { ...item, isVerified: next } : item),
    }));
  });

  const patchStatus = async (account) => {
    const next = !account.isActive;
    const approved = await confirm(
      next
        ? `Reactivate ${account.displayName}? They will be able to sign in again.`
        : `Deactivate ${account.displayName}? Their sessions will be revoked immediately.`,
      {
        title: next ? "Reactivate account" : "Deactivate account",
        confirmLabel: next ? "Reactivate" : "Deactivate",
        danger: !next,
      },
    );
    if (!approved) return;
    await runAction(`user-${account.id}`, async () => {
      await axiosClient.patch(`/admin/users/${account.id}/status`, { isActive: next });
      setData((current) => ({
        ...current,
        users: current.users.map((item) => item.id === account.id ? { ...item, isActive: next } : item),
        artists: current.artists.map((item) => item.userId === account.id ? { ...item, user: { ...item.user, isActive: next } } : item),
      }));
    });
  };

  const patchRole = async (account, role) => {
    if (role === account.role) return;
    const approved = await confirm(
      `Change ${account.displayName}'s role from ${account.role} to ${role}? Their current sessions will be revoked.`,
      { title: "Change account role", confirmLabel: "Change role", danger: role === "ADMIN" },
    );
    if (!approved) return;
    await runAction(`user-${account.id}`, async () => {
      await axiosClient.patch(`/admin/users/${account.id}/role`, { role });
      setData((current) => ({
        ...current,
        users: current.users.map((item) => item.id === account.id ? { ...item, role } : item),
        artists: current.artists.map((item) => item.userId === account.id ? { ...item, user: { ...item.user, role } } : item),
      }));
    });
  };

  const toggleTrack = (track) => runAction(`track-${track.id}`, async () => {
    const next = !track.isPublished;
    const response = await axiosClient.patch(`/admin/tracks/${track.id}`, { isPublished: next });
    setData((current) => ({
      ...current,
      tracks: current.tracks.map((item) => item.id === track.id ? { ...item, ...response.track } : item),
    }));
  });

  const saveTrack = () => {
    const draft = editingTrack;
    if (!draft) return;
    return runAction(`track-${draft.id}`, async () => {
      const response = await axiosClient.patch(`/admin/tracks/${draft.id}`, {
        title: draft.title,
        genre: draft.genre,
        language: draft.language,
      });
      setData((current) => ({
        ...current,
        tracks: current.tracks.map((item) => item.id === draft.id ? { ...item, ...response.track } : item),
      }));
      setEditingTrack(null);
    });
  };

  const deleteTrack = async (track) => {
    const approved = await confirm(
      `Permanently delete “${track.title}”? This removes the database record and its stored audio and cover files.`,
      { title: "Delete track permanently", confirmLabel: "Delete track", danger: true },
    );
    if (!approved) return;
    await runAction(`track-${track.id}`, async () => {
      await axiosClient.delete(`/admin/tracks/${track.id}`);
      setData((current) => ({ ...current, tracks: current.tracks.filter((item) => item.id !== track.id) }));
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => ({
    users: data.users.filter((item) => !normalizedQuery || [item.displayName, item.username, item.email, item.role].some((value) => value?.toLowerCase().includes(normalizedQuery))),
    artists: data.artists.filter((item) => !normalizedQuery || [item.name, item.user?.email].some((value) => value?.toLowerCase().includes(normalizedQuery))),
    tracks: data.tracks.filter((item) => !normalizedQuery || [item.title, item.artist?.name, item.genre, item.language].some((value) => value?.toLowerCase().includes(normalizedQuery))),
  }), [data, normalizedQuery]);

  const stats = {
    users: data.users.length,
    active: data.users.filter((item) => item.isActive).length,
    artists: data.artists.filter((item) => ["ARTIST", "ADMIN"].includes(item.user?.role) && item.user?.isActive).length,
    verified: data.artists.filter((item) => item.isVerified).length,
    published: data.tracks.filter((item) => item.isPublished).length,
    plays: data.tracks.reduce((sum, item) => sum + (item.playCount || 0), 0),
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-16 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Noor control centre</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Administration</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage account access, roles, artists, verification, and the audio catalog.</p>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">
          <i className="ti ti-refresh" /> Refresh data
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <nav className="flex gap-2 overflow-x-auto border-b border-white/5 pb-3">
        {TABS.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${tab === item.id ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/5 bg-zinc-900 text-zinc-400"}`}>
            <i className={`ti ${item.icon}`} /> {item.label}
          </button>
        ))}
      </nav>

      {tab !== "overview" && (
        <label className="relative block max-w-lg">
          <i className="ti ti-search absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}...`} className="w-full rounded-xl border border-white/5 bg-zinc-900 py-3 pl-11 pr-4 text-sm text-zinc-100 outline-none focus:border-emerald-500/40" />
        </label>
      )}

      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[
            ["Registered accounts", stats.users, "ti-users"],
            ["Active accounts", stats.active, "ti-user-check"],
            ["Active artists", stats.artists, "ti-microphone-2"],
            ["Verified artists", stats.verified, "ti-rosette"],
            ["Published tracks", stats.published, "ti-music"],
            ["Total recorded plays", fmtNum(stats.plays), "ti-player-play"],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-zinc-900/70 p-5">
              <i className={`ti ${icon} text-xl text-emerald-400`} />
              <strong className="mt-5 block text-2xl text-white">{value}</strong>
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <section className="space-y-3">
          {filtered.users.map((account) => {
            const isSelf = account.id === currentUser?.id;
            return (
              <article key={account.id} className="grid gap-4 rounded-2xl border border-white/5 bg-zinc-900/70 p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-bold text-zinc-100">{account.displayName}</h2>
                    {isSelf && <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">YOU</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPill(account.isActive)}`}>{account.isActive ? "ACTIVE" : "DEACTIVATED"}</span>
                  </div>
                  <p className="truncate text-xs text-zinc-500">@{account.username} · {account.email}</p>
                  <p className="mt-2 text-[11px] text-zinc-600">{account._count?.playlists ?? 0} playlists · {account._count?.likes ?? 0} liked tracks</p>
                </div>
                <select value={account.role} disabled={isSelf || busy === `user-${account.id}`} onChange={(event) => patchRole(account, event.target.value)} className="rounded-xl border border-white/5 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 disabled:opacity-50">
                  {ROLES.map((role) => <option key={role}>{role}</option>)}
                </select>
                <button disabled={isSelf || busy === `user-${account.id}`} onClick={() => patchStatus(account)} className={`rounded-xl border-0 px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${account.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-600 text-white hover:bg-emerald-500"}`}>
                  {busy === `user-${account.id}` ? "Updating…" : account.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {tab === "artists" && (
        <section className="grid gap-3 md:grid-cols-2">
          {filtered.artists.map((artist) => (
            <article key={artist.id} className="rounded-2xl border border-white/5 bg-zinc-900/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-bold text-zinc-100">{artist.name}</h2>
                    {artist.isVerified && <VerifiedBadge showLabel={false} />}
                  </div>
                  <p className="truncate text-xs text-zinc-500">{artist.user?.email}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPill(artist.user?.isActive)}`}>{artist.user?.isActive && ["ARTIST", "ADMIN"].includes(artist.user?.role) ? "PUBLIC" : "HIDDEN"}</span>
              </div>
              <div className="my-5 grid grid-cols-3 gap-2 text-center">
                {[["Tracks", artist._count?.tracks], ["Albums", artist._count?.albums], ["Followers", artist._count?.followers]].map(([label, value]) => <div key={label} className="rounded-xl bg-zinc-950/70 p-2"><strong className="block text-zinc-200">{value ?? 0}</strong><span className="text-[10px] text-zinc-600">{label}</span></div>)}
              </div>
              <button disabled={artist.user?.role === "ADMIN" || busy === `artist-${artist.id}`} onClick={() => patchArtist(artist)} className={`w-full rounded-xl border-0 px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed ${artist.isVerified ? "bg-zinc-800 text-zinc-300" : "bg-sky-600 text-white hover:bg-sky-500"}`}>
                {artist.user?.role === "ADMIN" ? "Verified by default" : artist.isVerified ? "Remove verification" : "Verify artist"}
              </button>
            </article>
          ))}
        </section>
      )}

      {tab === "tracks" && (
        <section className="space-y-3">
          {filtered.tracks.map((track) => {
            const editing = editingTrack?.id === track.id;
            return (
              <article key={track.id} className="rounded-2xl border border-white/5 bg-zinc-900/70 p-4">
                {editing ? (
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_150px_auto] lg:items-end">
                    <label className="text-xs text-zinc-500">Title<input value={editingTrack.title} onChange={(event) => setEditingTrack((value) => ({ ...value, title: event.target.value }))} className="mt-1 block w-full rounded-xl border border-white/5 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" /></label>
                    <label className="text-xs text-zinc-500">Genre<select value={editingTrack.genre} onChange={(event) => setEditingTrack((value) => ({ ...value, genre: event.target.value }))} className="mt-1 block w-full rounded-xl border border-white/5 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100">{GENRES.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label className="text-xs text-zinc-500">Language<select value={editingTrack.language} onChange={(event) => setEditingTrack((value) => ({ ...value, language: event.target.value }))} className="mt-1 block w-full rounded-xl border border-white/5 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100">{LANGUAGES.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <div className="flex gap-2"><button onClick={saveTrack} className="rounded-xl border-0 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Save</button><button onClick={() => setEditingTrack(null)} className="rounded-xl border-0 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300">Cancel</button></div>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold text-zinc-100">{track.title}</h2>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${track.isPublished ? statusPill(true) : "border-amber-500/20 bg-amber-500/10 text-amber-400"}`}>{track.isPublished ? "PUBLISHED" : "HIDDEN"}</span>
                      </div>
                      <p className="text-xs text-zinc-500">{track.artist?.name} · {track.genre} · {track.language}</p>
                      <p className="mt-2 text-[11px] text-zinc-600">{fmtDur(track.duration)} · {fmtNum(track.playCount)} plays · {track._count?.likes ?? 0} likes</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setEditingTrack({ id: track.id, title: track.title, genre: track.genre, language: track.language })} className="rounded-xl border-0 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300">Edit</button>
                      <button disabled={busy === `track-${track.id}`} onClick={() => toggleTrack(track)} className="rounded-xl border-0 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400">{track.isPublished ? "Unpublish" : "Publish"}</button>
                      <button disabled={busy === `track-${track.id}`} onClick={() => deleteTrack(track)} className="rounded-xl border-0 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400">Delete</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {tab !== "overview" && !filtered[tab]?.length && <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">No matching {tab}.</div>}
    </div>
  );
}
