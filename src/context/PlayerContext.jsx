import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Howl } from "howler";
import { axiosClient, API } from "../lib/api";
import { useAuth } from "./AuthContext"; // 1. Import useAuth

const PlayerCtx = createContext(null);
export const usePlayer = () => useContext(PlayerCtx);
const PLAYER_SESSION_KEY = "noor_player_session";

const formatTime = (secs) => {
  if (isNaN(secs) || secs === null) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${returnedSeconds}`;
};

export function PlayerProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const howlRef = useRef(null);
  const seekRafRef = useRef(null);
  const currentTrackRef = useRef(null);
  const playbackSessionRef = useRef(null);
  const playRecordedRef = useRef(false);
  const userRef = useRef(user);
  const advanceRef = useRef(null);
  const repeatRef = useRef("off");
  const restoreAttemptedRef = useRef(false);
  const snapshotRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolState] = useState(() => Number(localStorage.getItem("noor_volume") ?? 0.75));
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off");

  useEffect(() => {
    repeatRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    currentTrackRef.current = current;
  }, [current]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const startSeekLoop = useCallback(() => {
    const tick = () => {
      const h = howlRef.current;
      if (!h) return;
      const pos = typeof h.seek() === "number" ? h.seek() : 0;
      const dur = h.duration() || 0;

      setElapsed(pos);
      setProgress(dur > 0 ? (pos / dur) * 100 : 0);
      const threshold = Math.min(30, Math.max(5, dur * 0.5));
      if (!playRecordedRef.current && pos >= threshold) {
        playRecordedRef.current = true;
        axiosClient.post(`/tracks/${currentTrackRef.current.id}/play`, {
          sessionId: playbackSessionRef.current,
          listenedMs: Math.round(pos * 1000),
        }).catch(() => {
          playRecordedRef.current = false;
        });
      }
      seekRafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(seekRafRef.current);
    seekRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopSeekLoop = useCallback(() => {
    cancelAnimationFrame(seekRafRef.current);
  }, []);

  const destroyCurrent = useCallback(() => {
    stopSeekLoop();
    if (howlRef.current) {
      howlRef.current.off();
      howlRef.current.unload();
      howlRef.current = null;
    }
  }, [stopSeekLoop]);

  const resetPlayer = useCallback(() => {
    destroyCurrent();
    snapshotRef.current = null;
    localStorage.removeItem(PLAYER_SESSION_KEY);
    setCurrent(null);
    setQueue([]);
    setStatus("idle");
    setProgress(0);
    setElapsed(0);
    setDuration(0);
  }, [destroyCurrent]);

  // Clear another user's queue on an actual account switch, but do not treat
  // the initial async auth restoration as a logout/login cycle.
  const prevUserIdRef = useRef(undefined);
  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id ?? null;
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = userId;
      return;
    }
    if (prevUserIdRef.current !== userId) {
      resetPlayer();
      prevUserIdRef.current = userId;
    }
  }, [authLoading, user?.id, resetPlayer]);

  // ── core player control execution routine ──────────────────────────────────
  const play = useCallback(
    (track, newQueue = [], options = {}) => {
      const startAt = Math.max(0, Number(options.startAt) || 0);
      const autoplay = options.autoplay !== false;

      if (howlRef.current && currentTrackRef.current?.id === track.id) {
        if (howlRef.current.state() === "loaded") {
          howlRef.current.play();
        }
        return;
      }

      destroyCurrent();
      setCurrent(track);
      setStatus("loading");
      setProgress(0);
      setElapsed(0);
      setDuration(0);
      setQueue(newQueue);
      playbackSessionRef.current = options.sessionId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${track.id}`;
      playRecordedRef.current = Boolean(options.playRecorded);

      const src = `${API}/tracks/${track.id}/stream`;

      const h = new Howl({
        src: [src],
        html5: true,
        volume: volume,
        format: ["mp3", "wav", "flac", "m4a"],
        xhr: {
          withCredentials: false,
        },

        onload: () => {
          const loadedDuration = h.duration() || Number(track.duration) || 0;
          const restoredPosition = Math.min(startAt, Math.max(loadedDuration - 0.25, 0));
          setDuration(loadedDuration);
          if (restoredPosition > 0) {
            h.seek(restoredPosition);
            setElapsed(restoredPosition);
            setProgress(loadedDuration > 0 ? (restoredPosition / loadedDuration) * 100 : 0);
          }
          if (!autoplay) setStatus("paused");
        },

        onloaderror: (_id, err) => {
          console.error(
            `[Howler Stream Error] failed path: "${track.title}" (${src}) — code:`,
            err,
          );
          setStatus("error");
          setTimeout(() => advanceRef.current?.(true), 1200);
        },

        onplayerror: (_id, err) => {
          console.error(
            "[Howler Playback Interruption] interaction required:",
            err,
          );
          setStatus("paused");
          h.once("unlock", () => h.play());
        },

        onplay: () => {
          setStatus("playing");
          startSeekLoop();
        },
        onpause: () => {
          setStatus("paused");
          stopSeekLoop();
        },
        onstop: () => {
          setStatus("paused");
          stopSeekLoop();
          setProgress(0);
          setElapsed(0);
        },

        onend: () => {
          stopSeekLoop();
          setProgress(100);
          setTimeout(() => advanceRef.current?.(true), 300);
        },

        onseek: () => {
          const pos = typeof h.seek() === "number" ? h.seek() : 0;
          setElapsed(pos);
          setProgress(h.duration() > 0 ? (pos / h.duration()) * 100 : 0);
        },
      });

      howlRef.current = h;
      if (autoplay) h.play();
      else h.load();
    },
    [destroyCurrent, startSeekLoop, stopSeekLoop, volume],
  );

  const pause = useCallback(() => howlRef.current?.pause(), []);
  const resume = useCallback(() => howlRef.current?.play(), []);

  const togglePlay = useCallback(() => {
    if (!howlRef.current || !currentTrackRef.current) return;
    howlRef.current.playing() ? pause() : resume();
  }, [pause, resume]);

  const seek = useCallback((pct) => {
    const h = howlRef.current;
    if (!h || !h.duration()) return;
    const pos = (pct / 100) * h.duration();
    h.seek(pos);
    setElapsed(pos);
    setProgress(pct);
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolState(clamped);
    localStorage.setItem("noor_volume", String(clamped));
    if (howlRef.current) howlRef.current.volume(clamped);
  }, []);

  const playNext = useCallback((fromEnd = false) => {
    const activeTrack = currentTrackRef.current;
    if (!queue.length || !activeTrack) return;
    if (fromEnd && repeatRef.current === "one") {
      howlRef.current?.seek(0);
      howlRef.current?.play();
      return;
    }
    const index = queue.findIndex((track) => track.id === activeTrack.id);
    let next;
    if (shuffle && queue.length > 1) {
      const candidates = queue.filter((track) => track.id !== activeTrack.id);
      next = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      next = queue[index + 1];
    }
    if (!next && repeatRef.current === "all") next = queue[0];
    if (next) play(next, queue);
    else if (fromEnd) setStatus("paused");
  }, [queue, play, shuffle]);

  useEffect(() => {
    advanceRef.current = playNext;
  }, [playNext]);

  const toggleShuffle = useCallback(() => setShuffle((value) => !value), []);
  const cycleRepeat = useCallback(() => {
    setRepeatMode((value) => value === "off" ? "all" : value === "all" ? "one" : "off");
  }, []);

  const playPrev = useCallback(() => {
    if (
      howlRef.current &&
      typeof howlRef.current.seek() === "number" &&
      howlRef.current.seek() > 3
    ) {
      seek(0);
      return;
    }
    const activeTrack = currentTrackRef.current;
    if (!activeTrack) return;
    const prev = queue[queue.findIndex((t) => t.id === activeTrack.id) - 1];
    if (prev) play(prev, queue);
  }, [queue, play, seek]);

  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(volume);
  }, [volume]);

  // Keep enough information to rebuild the player after a refresh. The live
  // position is checkpointed periodically and once more during pagehide.
  useEffect(() => {
    snapshotRef.current = current
      ? {
          current,
          queue,
          position: elapsed,
          duration,
          status,
          shuffle,
          repeatMode,
          userId: user?.id ?? null,
          playbackSessionId: playbackSessionRef.current,
          playRecorded: playRecordedRef.current,
          savedAt: Date.now(),
        }
      : null;
  }, [current, queue, elapsed, duration, status, shuffle, repeatMode, user?.id]);

  const persistSnapshot = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot?.current?.id) return;
    try {
      const livePosition = howlRef.current?.seek();
      const checkpoint = {
        ...snapshot,
        position: typeof livePosition === "number" ? livePosition : snapshot.position,
        status: howlRef.current
          ? howlRef.current.playing()
            ? "playing"
            : howlRef.current.state() === "loading"
              ? "loading"
              : "paused"
          : snapshot.status,
        playbackSessionId: playbackSessionRef.current,
        playRecorded: playRecordedRef.current,
        savedAt: Date.now(),
      };
      localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(checkpoint));
    } catch {
      // Playback must continue even if storage is unavailable or full.
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(persistSnapshot, 2000);
    window.addEventListener("pagehide", persistSnapshot);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", persistSnapshot);
    };
  }, [persistSnapshot]);

  useEffect(() => {
    if (authLoading || restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    try {
      const raw = localStorage.getItem(PLAYER_SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const activeUserId = user?.id ?? null;
      if (!saved?.current?.id || (saved.userId ?? null) !== activeUserId) {
        localStorage.removeItem(PLAYER_SESSION_KEY);
        return;
      }

      setShuffle(Boolean(saved.shuffle));
      setRepeatMode(["off", "all", "one"].includes(saved.repeatMode) ? saved.repeatMode : "off");
      play(saved.current, Array.isArray(saved.queue) ? saved.queue : [], {
        startAt: saved.position,
        autoplay: saved.status === "playing" || saved.status === "loading",
        sessionId: saved.playbackSessionId,
        playRecorded: saved.playRecorded,
      });
    } catch {
      localStorage.removeItem(PLAYER_SESSION_KEY);
    }
  }, [authLoading, user?.id, play]);

  useEffect(() => () => {
    // React Strict Mode performs a development-only setup/cleanup/setup pass.
    // Allow that second setup to recreate a restored Howl instance.
    restoreAttemptedRef.current = false;
    destroyCurrent();
  }, [destroyCurrent]);

  return (
    <PlayerCtx.Provider
      value={{
        current,
        queue,
        status,
        playing: status === "playing",
        buffering: status === "loading",
        progress,
        elapsedFormatted: formatTime(elapsed),
        durationFormatted: formatTime(duration),
        elapsed,
        duration,
        progressRaw: progress,
        volume,
        shuffle,
        repeatMode,
        play,
        pause,
        resume,
        togglePlay,
        seek,
        setVolume,
        playNext,
        playPrev,
        toggleShuffle,
        cycleRepeat,
        resetPlayer,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}
