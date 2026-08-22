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

const formatTime = (secs) => {
  if (isNaN(secs) || secs === null) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${returnedSeconds}`;
};

export function PlayerProvider({ children }) {
  const { user } = useAuth(); // 2. Access current authenticated user
  const howlRef = useRef(null);
  const seekRafRef = useRef(null);
  const currentTrackRef = useRef(null);
  const playbackSessionRef = useRef(null);
  const playRecordedRef = useRef(false);
  const userRef = useRef(user);
  const advanceRef = useRef(null);
  const repeatRef = useRef("off");

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

  // 3. Reset player method
  const resetPlayer = useCallback(() => {
    destroyCurrent();
    setCurrent(null);
    setQueue([]);
    setStatus("idle");
    setProgress(0);
    setElapsed(0);
    setDuration(0);
  }, [destroyCurrent]);

  // 4. Automatically clear/reset state when user logs out or switches
  const prevUserIdRef = useRef(user?.id);
  useEffect(() => {
    // If the user ID changes (or user logs out)
    if (prevUserIdRef.current !== user?.id) {
      resetPlayer();
      prevUserIdRef.current = user?.id;
    }
  }, [user?.id, resetPlayer]);

  // ── core player control execution routine ──────────────────────────────────
  const play = useCallback(
    (track, newQueue = []) => {
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
      playbackSessionRef.current = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${track.id}`;
      playRecordedRef.current = false;

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
          setDuration(h.duration());
          setStatus("playing");
          startSeekLoop();

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
      h.play();
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

  useEffect(() => () => destroyCurrent(), [destroyCurrent]);

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
