import { useEffect, useState } from "react";
import { axiosClient } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const EVENT = "noor:track-like";

export function useTrackLike(track) {
  const { user } = useAuth();
  const { alert: showAlert } = useDialog();
  const [liked, setLiked] = useState(Boolean(track?.likedByMe ?? track?.liked));
  const suppliedLikesCount = track?.likesCount ?? track?._count?.likes ?? (Array.isArray(track?.likes) ? track.likes.length : 0);
  const initialCount = suppliedLikesCount;
  const [likesCount, setLikesCount] = useState(initialCount);

  useEffect(() => {
    setLiked(Boolean(track?.likedByMe ?? track?.liked));
    setLikesCount(suppliedLikesCount);
  }, [track?.id, track?.likedByMe, track?.liked, suppliedLikesCount]);

  useEffect(() => {
    const sync = (event) => {
      if (event.detail.trackId === track?.id) {
        setLiked(event.detail.liked);
        if (Number.isFinite(event.detail.likesCount)) setLikesCount(event.detail.likesCount);
      }
    };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [track?.id]);

  const toggleLike = async () => {
    if (!track) return false;
    if (!user) {
      showAlert("Sign in to save tracks to your library.", { title: "Sign in required" });
      return false;
    }
    const previous = liked;
    const previousCount = likesCount;
    const next = !previous;
    const nextCount = Math.max(0, previousCount + (next ? 1 : -1));
    setLiked(next);
    setLikesCount(nextCount);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { trackId: track.id, liked: next, likesCount: nextCount } }));
    try {
      const response = next
        ? await axiosClient.post(`/tracks/${track.id}/like`)
        : await axiosClient.delete(`/tracks/${track.id}/like`);
      const confirmedCount = response.likesCount ?? nextCount;
      setLikesCount(confirmedCount);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { trackId: track.id, liked: next, likesCount: confirmedCount } }));
      return true;
    } catch {
      setLiked(previous);
      setLikesCount(previousCount);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { trackId: track.id, liked: previous, likesCount: previousCount } }));
      return false;
    }
  };

  return { liked, likesCount, toggleLike };
}
