import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import { usePlayer } from "../context/PlayerContext";
import { axiosClient } from "../lib/api";

export default function TrackDeepLinkPage() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { play } = usePlayer();
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    axiosClient.get(`/tracks/${trackId}`, { signal: controller.signal })
      .then(({ track }) => {
        if (!track || controller.signal.aborted) return;
        play(track, [track], { autoplay: false });
        navigate("/now-playing", { replace: true, state: { from: "/" } });
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError(requestError.message);
      });
    return () => controller.abort();
  }, [navigate, play, trackId]);

  if (!error) return <PageLoader />;

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
      <i className="ti ti-music-off text-4xl text-zinc-600" aria-hidden="true" />
      <h1 className="mt-4 text-lg font-bold text-zinc-100">Track unavailable</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">{error}</p>
      <button type="button" onClick={() => navigate("/browse")} className="mt-6 rounded-xl border-0 bg-emerald-600 px-5 py-3 text-sm font-bold text-white">
        Browse Noor
      </button>
    </div>
  );
}
