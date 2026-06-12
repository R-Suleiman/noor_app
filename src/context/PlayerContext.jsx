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

const PlayerCtx = createContext(null);
export const usePlayer = () => useContext(PlayerCtx);

export function PlayerProvider({ children }) {
  const howlRef = useRef(null);
  const seekRafRef = useRef(null);

  // Keeps track of the active track object in a mutable reference to avoid re-binding callbacks
  const currentTrackRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | playing | paused | error
  const [progress, setProgress] = useState(0); // 0–100
  const [elapsed, setElapsed] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [volume, setVolState] = useState(0.75);

  // Synchronize the component state to our reference hook
  useEffect(() => {
    currentTrackRef.current = current;
  }, [current]);

  // ── seek bar animation rAF frame loop ──────────────────────────────────────
  const startSeekLoop = useCallback(() => {
    const tick = () => {
      const h = howlRef.current;
      if (!h) return;
      const pos = typeof h.seek() === "number" ? h.seek() : 0;
      const dur = h.duration() || 0;
      setElapsed(pos);
      setProgress(dur > 0 ? (pos / dur) * 100 : 0);
      seekRafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(seekRafRef.current);
    seekRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopSeekLoop = useCallback(() => {
    cancelAnimationFrame(seekRafRef.current);
  }, []);

  // ── tear down current Howl instance ────────────────────────────────────────
  const destroyCurrent = useCallback(() => {
    stopSeekLoop();
    if (howlRef.current) {
      howlRef.current.off();
      howlRef.current.unload();
      howlRef.current = null;
    }
  }, [stopSeekLoop]);

  // ── core player control execution routine ──────────────────────────────────
  const play = useCallback(
    (track, newQueue = []) => {
      // If the same track is requested while loaded, simply toggle its state
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
      if (newQueue.length > 0) setQueue(newQueue);

      // Stream directly from our range-request optimized Fastify endpoint
      const src = `${API}/tracks/${track.id}/stream`;

      const h = new Howl({
        src: [src],
        html5: true, // Stream chunks natively without pre-buffering the complete audio file
        volume: volume,
        format: ["mp3", "wav", "flac", "m4a"],
        xhr: {
          withCredentials: false,
        },

        onload: () => {
          setDuration(h.duration());
          setStatus("playing");
          startSeekLoop();

          axiosClient
            .post(`/tracks/${track.id}/play`, {
              durationMs: h.duration() * 1000,
            })
            .catch(() => {});
        },

        onloaderror: (_id, err) => {
          console.error(
            `[Howler Stream Error] failed path: "${track.title}" (${src}) — code:`,
            err,
          );
          setStatus("error");
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
          // Step into the next track in the queue safely using accurate state updates
          setQueue((currentQueue) => {
            const idx = currentQueue.findIndex((t) => t.id === track.id);
            const next = currentQueue[idx + 1];
            if (next) {
              setTimeout(() => play(next, currentQueue), 300);
            } else {
              setStatus("paused");
            }
            return currentQueue;
          });
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
    if (howlRef.current) howlRef.current.volume(clamped);
  }, []);

  const playNext = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    if (!queue.length || !activeTrack) return;
    const next = queue[queue.findIndex((t) => t.id === activeTrack.id) + 1];
    if (next) play(next, queue);
  }, [queue, play]);

  const playPrev = useCallback(() => {
    // If we are deep into a track (>3 seconds), restart it instead of changing songs
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

  // Keep audio volume accurately bounded in real time
  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(volume);
  }, [volume]);

  // Cleanup on context unmount
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
        elapsed,
        duration,
        volume,
        play,
        pause,
        resume,
        togglePlay,
        seek,
        setVolume,
        playNext,
        playPrev,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}
