import { useEffect, useState } from "react";
import { axiosClient } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const EVENT = "noor:track-like";
const snapshots = new Map();

const snapshotKey = (userId, trackId) => `${userId || "guest"}:${trackId}`;
const suppliedState = (track) => ({
  liked: Boolean(track?.likedByMe ?? track?.liked),
  likesCount: track?.likesCount ?? track?._count?.likes ?? (Array.isArray(track?.likes) ? track.likes.length : 0),
});

const publishSnapshot = (userId, trackId, snapshot) => {
  if (!trackId) return;
  snapshots.set(snapshotKey(userId, trackId), snapshot);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { userId, trackId, ...snapshot } }));
};

export function useTrackLike(track, { refresh = false } = {}) {
  const { user } = useAuth();
  const { alert: showAlert } = useDialog();
  const providedLiked = Boolean(track?.likedByMe ?? track?.liked);
  const providedLikesCount = track?.likesCount ?? track?._count?.likes ?? (Array.isArray(track?.likes) ? track.likes.length : 0);
  const initial = snapshots.get(snapshotKey(user?.id, track?.id)) || { liked: providedLiked, likesCount: providedLikesCount };
  const [liked, setLiked] = useState(initial.liked);
  const [likesCount, setLikesCount] = useState(initial.likesCount);

  useEffect(() => {
    const next = snapshots.get(snapshotKey(user?.id, track?.id)) || { liked: providedLiked, likesCount: providedLikesCount };
    setLiked(next.liked);
    setLikesCount(next.likesCount);
  }, [user?.id, track?.id, providedLiked, providedLikesCount]);

  useEffect(() => {
    const sync = (event) => {
      if (event.detail.trackId === track?.id && event.detail.userId === user?.id) {
        setLiked(event.detail.liked);
        if (Number.isFinite(event.detail.likesCount)) setLikesCount(event.detail.likesCount);
      }
    };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [track?.id, user?.id]);

  useEffect(() => {
    if (!refresh || !track?.id) return undefined;
    let active = true;
    axiosClient.get(`/tracks/${track.id}`).then((response) => {
      if (!active || !response.track) return;
      publishSnapshot(user?.id, track.id, suppliedState(response.track));
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [refresh, track?.id, user?.id]);

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
    publishSnapshot(user.id, track.id, { liked: next, likesCount: nextCount });
    try {
      const response = next
        ? await axiosClient.post(`/tracks/${track.id}/like`)
        : await axiosClient.delete(`/tracks/${track.id}/like`);
      const confirmedLiked = response.liked ?? next;
      const confirmedCount = response.likesCount ?? nextCount;
      setLiked(confirmedLiked);
      setLikesCount(confirmedCount);
      publishSnapshot(user.id, track.id, { liked: confirmedLiked, likesCount: confirmedCount });
      return true;
    } catch {
      setLiked(previous);
      setLikesCount(previousCount);
      publishSnapshot(user.id, track.id, { liked: previous, likesCount: previousCount });
      return false;
    }
  };

  return { liked, likesCount, toggleLike };
}
