import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Howl } from "howler";
import { axiosClient, API, mediaUrl } from "../lib/api";
import { useAuth } from "./AuthContext";

const PlayerCtx = createContext(null);
export const usePlayer = () => useContext(PlayerCtx);
const PLAYER_SESSION_KEY = "noor_player_session";

const initialVolume = () => {
  try {
    const saved = Number(localStorage.getItem("noor_volume") ?? 0.75);
    return Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : 0.75;
  } catch {
    return 0.75;
  }
};

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
  const seekTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const playbackSessionRef = useRef(null);
  const playRecordedRef = useRef(false);
  const advanceRef = useRef(null);
  const repeatRef = useRef("off");
  const playbackContextRef = useRef(null);
  const restoreAttemptedRef = useRef(false);
  const snapshotRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  const [volume, setVolState] = useState(initialVolume);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off");
  const [playbackContext, setPlaybackContext] = useState(null);

  useEffect(() => {
    repeatRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    currentTrackRef.current = current;
  }, [current]);

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
        const countedTrackId = currentTrackRef.current.id;
        axiosClient.post(`/tracks/${countedTrackId}/play`, {
          sessionId: playbackSessionRef.current,
          listenedMs: Math.round(pos * 1000),
        }).then((response) => {
          if (response.counted) {
            setCurrent((active) => active?.id === countedTrackId
              ? { ...active, playCount: (active.playCount || 0) + 1 }
              : active);
          }
        }).catch(() => {
          playRecordedRef.current = false;
        });
      }
    };
    window.clearInterval(seekTimerRef.current);
    tick();
    // Four updates per second feel smooth while avoiding a permanent 60fps
    // animation loop that wastes battery on mobile devices.
    seekTimerRef.current = window.setInterval(tick, 250);
  }, []);

  const stopSeekLoop = useCallback(() => {
    window.clearInterval(seekTimerRef.current);
    seekTimerRef.current = null;
  }, []);

  const destroyCurrent = useCallback(() => {
    stopSeekLoop();
    window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
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
    playbackContextRef.current = null;
    setPlaybackContext(null);
    setStatus("idle");
    setProgress(0);
    setElapsed(0);
    setDuration(0);
    setPlaybackError("");
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
      const nextContext = options.context ?? null;
      playbackContextRef.current = nextContext;
      setPlaybackContext(nextContext);

      if (howlRef.current && currentTrackRef.current?.id === track.id) {
        if (howlRef.current.state() === "loaded") {
          if (!howlRef.current.playing()) howlRef.current.play();
          return;
        }
        if (howlRef.current.state() === "loading") return;
      }

      destroyCurrent();
      setCurrent(track);
      setStatus("loading");
      setProgress(0);
      setElapsed(0);
      setDuration(0);
      setPlaybackError("");
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
          if (howlRef.current !== h) return;
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
          if (howlRef.current !== h) return;
          console.error(
            `[Howler Stream Error] failed path: "${track.title}" (${src}) — code:`,
            err,
          );
          setStatus("error");
          setPlaybackError(navigator.onLine
            ? "This track could not be loaded."
            : "Reconnect to continue streaming this track.");
          if (navigator.onLine) {
            advanceTimerRef.current = window.setTimeout(() => {
              if (howlRef.current === h) advanceRef.current?.(true);
            }, 1200);
          }
        },

        onplayerror: (_id, err) => {
          if (howlRef.current !== h) return;
          console.error(
            "[Howler Playback Interruption] interaction required:",
            err,
          );
          setStatus("paused");
          setPlaybackError("Tap play to continue listening.");
        },

        onplay: () => {
          if (howlRef.current !== h) return;
          setStatus("playing");
          setPlaybackError("");
          startSeekLoop();
        },
        onpause: () => {
          if (howlRef.current !== h) return;
          setStatus("paused");
          stopSeekLoop();
        },
        onstop: () => {
          if (howlRef.current !== h) return;
          setStatus("paused");
          stopSeekLoop();
          setProgress(0);
          setElapsed(0);
        },

        onend: () => {
          if (howlRef.current !== h) return;
          stopSeekLoop();
          setProgress(100);
          advanceTimerRef.current = window.setTimeout(() => {
            if (howlRef.current === h) advanceRef.current?.(true);
          }, 300);
        },

        onseek: () => {
          if (howlRef.current !== h) return;
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
  const resume = useCallback(() => {
    const h = howlRef.current;
    if (!h || h.playing() || h.state() === "loading") return;
    h.play();
  }, []);

  const togglePlay = useCallback(() => {
    if (!howlRef.current || !currentTrackRef.current) return;
    if (howlRef.current.state() === "loading") return;
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
    try {
      localStorage.setItem("noor_volume", String(clamped));
    } catch {
      // Volume still changes for this session when storage is unavailable.
    }
    if (howlRef.current) howlRef.current.volume(clamped);
  }, []);

  const playNext = useCallback((fromEnd = false) => {
    const activeTrack = currentTrackRef.current;
    if (!queue.length || !activeTrack) {
      if (fromEnd) setStatus("paused");
      return;
    }
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
    if (next) play(next, queue, { context: playbackContextRef.current });
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
    const currentIndex = queue.findIndex((t) => t.id === activeTrack.id);
    const prev = queue[currentIndex - 1]
      || (repeatRef.current === "all" ? queue.at(-1) : null);
    if (prev) play(prev, queue, { context: playbackContextRef.current });
  }, [queue, play, seek]);

  const updatePlaybackContext = useCallback((context) => {
    playbackContextRef.current = context ?? null;
    setPlaybackContext(context ?? null);
  }, []);

  // Present Noor as a first-class media app on supported phones and desktops:
  // metadata and controls appear on the lock screen, notification shade,
  // headset controls, and compatible connected devices.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return undefined;
    if (!current) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return undefined;
    }

    const artworkUrl = mediaUrl(current.album?.coverUrl || current.coverUrl);
    if ("MediaMetadata" in window) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: current.title,
        artist: current.artist?.name ?? current.artist ?? "Noor",
        album: current.album?.title ?? "Noor Islamic Audio",
        ...(artworkUrl && { artwork: [{ src: artworkUrl }] }),
      });
    }

    const changePosition = (nextPosition) => {
      const h = howlRef.current;
      if (!h || !h.duration()) return;
      const position = Math.max(0, Math.min(h.duration(), nextPosition));
      h.seek(position);
      setElapsed(position);
      setProgress((position / h.duration()) * 100);
    };
    const handlers = {
      play: resume,
      pause,
      previoustrack: playPrev,
      nexttrack: () => playNext(),
      seekbackward: (details) => {
        const currentPosition = Number(howlRef.current?.seek()) || 0;
        changePosition(currentPosition - (details.seekOffset || 10));
      },
      seekforward: (details) => {
        const currentPosition = Number(howlRef.current?.seek()) || 0;
        changePosition(currentPosition + (details.seekOffset || 10));
      },
      seekto: (details) => {
        if (Number.isFinite(details.seekTime)) changePosition(details.seekTime);
      },
      stop: () => {
        pause();
        changePosition(0);
      },
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Individual actions differ between browsers; supported controls remain.
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore actions not implemented by this browser.
        }
      }
    };
  }, [current, pause, playNext, playPrev, resume]);

  const elapsedSecond = Math.floor(elapsed);
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.playbackState = status === "playing" ? "playing" : "paused";
    if (!duration || !Number.isFinite(duration) || elapsedSecond > duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.max(0, elapsedSecond),
      });
    } catch {
      // Some engines expose Media Session without position-state support.
    }
  }, [current, duration, elapsedSecond, status]);

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
          playbackContext,
          userId: user?.id ?? null,
          playbackSessionId: playbackSessionRef.current,
          playRecorded: playRecordedRef.current,
          savedAt: Date.now(),
        }
      : null;
  }, [current, queue, elapsed, duration, status, shuffle, repeatMode, playbackContext, user?.id]);

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
        // Browsers can reject autoplay after a reload. Restoring paused avoids
        // a queued autoplay retry racing the user's Play tap and producing two
        // simultaneous Howler sound IDs.
        autoplay: false,
        sessionId: saved.playbackSessionId,
        playRecorded: saved.playRecorded,
        context: saved.playbackContext,
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
        playbackError,
        progressRaw: progress,
        volume,
        shuffle,
        repeatMode,
        playbackContext,
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
        updatePlaybackContext,
        resetPlayer,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}
