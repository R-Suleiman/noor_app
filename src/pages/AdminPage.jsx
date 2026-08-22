import { useEffect, useState } from "react";
import Spinner from "../components/Spinner";
import { axiosClient } from "../lib/api";

export default function AdminPage() {
  const [data, setData] = useState({ users: [], artists: [], tracks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => axiosClient.get("/admin/overview")
    .then(setData)
    .catch((requestError) => setError(requestError.message))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const patchArtist = async (artist) => {
    await axiosClient.patch(`/admin/artists/${artist.id}`, { isVerified: !artist.isVerified });
    setData((current) => ({ ...current, artists: current.artists.map((item) => item.id === artist.id ? { ...item, isVerified: !item.isVerified } : item) }));
  };
  const patchTrack = async (track) => {
    await axiosClient.patch(`/admin/tracks/${track.id}`, { isPublished: !track.isPublished });
    setData((current) => ({ ...current, tracks: current.tracks.map((item) => item.id === track.id ? { ...item, isPublished: !item.isPublished } : item) }));
  };
  const patchRole = async (user, role) => {
    await axiosClient.patch(`/admin/users/${user.id}/role`, { role });
    setData((current) => ({ ...current, users: current.users.map((item) => item.id === user.id ? { ...item, role } : item) }));
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-10">
      <div><h1 className="text-3xl font-bold">Administration</h1><p className="text-zinc-500">Moderate accounts, artists, and catalog visibility.</p></div>
      {error && <div className="text-red-400">{error}</div>}
      <section><h2 className="font-bold mb-3">Artists</h2><div className="space-y-2">{data.artists.map((artist) => <div key={artist.id} className="flex items-center bg-zinc-900 p-3 rounded-lg"><span>{artist.name}</span><button onClick={() => patchArtist(artist)} className="ml-auto bg-zinc-800 border-0 text-zinc-200 rounded px-3 py-1 cursor-pointer">{artist.isVerified ? "Remove verification" : "Verify"}</button></div>)}</div></section>
      <section><h2 className="font-bold mb-3">Recent tracks</h2><div className="space-y-2">{data.tracks.map((track) => <div key={track.id} className="flex items-center bg-zinc-900 p-3 rounded-lg"><span>{track.title} <small className="text-zinc-500">— {track.artist.name}</small></span><button onClick={() => patchTrack(track)} className="ml-auto bg-zinc-800 border-0 text-zinc-200 rounded px-3 py-1 cursor-pointer">{track.isPublished ? "Unpublish" : "Publish"}</button></div>)}</div></section>
      <section><h2 className="font-bold mb-3">Users</h2><div className="space-y-2">{data.users.map((user) => <div key={user.id} className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg"><span className="min-w-0 flex-1 truncate">{user.displayName} <small className="text-zinc-500">{user.email}</small></span><select value={user.role} onChange={(event) => patchRole(user, event.target.value)} className="bg-zinc-800 rounded p-1"><option>LISTENER</option><option>ARTIST</option><option>ADMIN</option></select></div>)}</div></section>
    </div>
  );
}
