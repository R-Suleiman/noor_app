import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { axiosClient } from "../lib/api";

export default function UploadPage() {
  const { user } = useAuth();
  
  // Field Form Mapping States
  const [f, setF] = useState({
    title: "",
    titleAr: "",
    titleSw: "",
    genre: "QASIDAS",
    language: "ARABIC",
    albumId: "" // Added explicit mapping placeholder for relational safety
  });
  
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [calculatedDuration, setCalculatedDuration] = useState(0);

  // System State Flags
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); // Track progress as an absolute percentage
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const coverInputRef = useRef(null);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  // Guard Clause Authentication Filter
  if (!user || user.role !== "ARTIST") {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-5 text-zinc-500">
          <i className="ti ti-lock text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-zinc-200 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Artist account required
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Only registered artists and verified madrassas can publish spiritual tracks to the Noor media network.
        </p>
      </div>
    );
  }

  // Intercept inbound audio selections to pull playhead runtime parameters safely
  const handleAudioSelection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setError("");

    // Dynamic extraction of track metrics using browser audio contexts
    const audioContext = new Audio();
    audioContext.src = URL.createObjectURL(file);
    audioContext.onloadedmetadata = () => {
      setCalculatedDuration(Math.round(audioContext.duration));
    };
  };

  // Process cover image placement previews cleanly
  const handleCoverSelection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!audioFile) return setError("Audio recording file is required.");
    if (!f.title.trim()) return setError("Main track title field cannot be blank.");

    setBusy(true);
    setError("");
    setProgress(0);

    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      if (coverFile) fd.append("cover", coverFile);
      fd.append("duration", calculatedDuration.toString());

      // Iterate and bind cleanly verified form elements
      Object.entries(f).forEach(([k, v]) => {
        if (v && v.trim() !== "") fd.append(k, v);
      });

      // Execute request with progress feedback loops via Axios Client context
      const res = await axiosClient.post("/upload/track", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      if (res.status === 201) {
        setDone(true);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || "An unexpected asset storage write error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const resetFormState = () => {
    setDone(false);
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    setCalculatedDuration(0);
    setProgress(0);
    setF({ title: "", titleAr: "", titleSw: "", genre: "QASIDAS", language: "ARABIC", albumId: "" });
  };

  // Success Lifecycle Display Component
  if (done) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400">
          <i className="ti ti-circle-check text-4xl animate-[bounce_1s_ease-in-out_infinite]" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-100 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Track Uploaded!
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          Your recording has been indexed and is now streaming live across the audio platform network.
        </p>
        <button
          onClick={resetFormState}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-3 px-6 rounded-xl border-0 cursor-pointer transition-all shadow-md"
        >
          Publish another track
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      
      {/* Page Header Header Meta Description */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight" style={{ fontFamily: "'Cinzel', serif" }}>
          Publish Media Creator
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Distribute qasidas, targeted madrasa notes, or nasheeds out to global feeds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Hand Column Panel Area — Assets Selectors */}
        <div className="md:col-span-1 space-y-6">
          
          {/* 1. Cover Artwork File Component Grid Selector */}
          <div>
            <label className="text-xs tracking-widest uppercase font-bold text-zinc-500 block mb-2">
              Collection Art
            </label>
            <div 
              onClick={() => !busy && coverInputRef.current?.click()}
              className="aspect-square w-full rounded-2xl bg-zinc-900 border-2 border-dashed border-white/5 hover:border-emerald-500/40 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all"
            >
              <input 
                type="file" 
                ref={coverInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleCoverSelection}
                disabled={busy}
              />
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Art Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-zinc-200">
                    Change Artwork
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <i className="ti ti-photo-plus text-3xl text-zinc-600 group-hover:text-emerald-400 transition-colors mb-2 block" />
                  <span className="text-xs text-zinc-500 block font-medium">JPG, WebP, PNG</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Secondary Display Window For Extracted Core File Metrics */}
          {audioFile && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-xs font-medium text-zinc-400 space-y-2">
              <div className="text-zinc-500 uppercase tracking-wider font-bold text-[10px] border-b border-zinc-800 pb-1.5 mb-2">File Inspector Output</div>
              <p className="truncate"><span className="text-zinc-600 font-mono">Format:</span> {audioFile.type || 'audio/unknown'}</p>
              <p><span className="text-zinc-600 font-mono">Size:</span> {(audioFile.size / 1024 / 1024).toFixed(2)} Megabytes</p>
              <p><span className="text-zinc-600 font-mono">Length:</span> {Math.floor(calculatedDuration / 60)}m {calculatedDuration % 60}s</p>
            </div>
          )}

        </div>

        {/* Right Hand Column Panel Area — Text Field Config Inputs */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Main Drag Drop Target Audio Field Slot Wrapper Block */}
          <label className={`group block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            audioFile ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5"
          }`}>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              onChange={handleAudioSelection} 
              disabled={busy} 
            />
            <i className={`ti ${audioFile ? "ti-file-music" : "ti-cloud-upload"} text-3xl block mb-2 transition-colors ${
              audioFile ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            {audioFile ? (
              <div>
                <p className="text-sm font-bold text-zinc-200 truncate max-w-md mx-auto">{audioFile.name}</p>
                <p className="text-xs text-emerald-400 mt-0.5">Audio stream extracted successfully</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-zinc-300">Drop your source recording binary here</p>
                <p className="text-xs text-zinc-600 mt-1">MP3, WAV, FLAC containers supported up to 200MB</p>
              </div>
            )}
          </label>

          {/* Core Text Form Payload Control Matrix Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["Global track title", "title", "sm:col-span-2", "e.g., Qamarun Sidnan Nabi"],
              ["Arabic notation script title", "titleAr", "", "بالعربية (اختياري)"],
              ["Swahili translation script title", "titleSw", "", "Kwa Kiswahili (hiari)"],
            ].map(([label, key, spacing, placeholder]) => (
              <div key={key} className={`flex flex-col gap-1.5 ${spacing}`}>
                <label className="text-[11px] tracking-wider uppercase font-bold text-zinc-500">{label}</label>
                <input
                  value={f[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  disabled={busy}
                  className="bg-zinc-900/60 border border-white/5 focus:border-emerald-500/60 text-sm text-zinc-100 px-4 py-3 rounded-xl outline-none transition-all placeholder:text-zinc-600 w-full font-medium"
                />
              </div>
            ))}

            {/* Categorization Selection Form Units */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-wider uppercase font-bold text-zinc-500">Genre Map</label>
              <select
                value={f.genre}
                onChange={(e) => set("genre", e.target.value)}
                disabled={busy}
                className="bg-zinc-900/60 border border-white/5 focus:border-emerald-500/60 text-sm text-zinc-100 px-4 py-3 rounded-xl outline-none cursor-pointer w-full font-medium"
              >
                {["QASIDAS", "NASHEEDS", "DUFF", "INSTRUMENTAL", "MADRASSA", "OTHER"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-wider uppercase font-bold text-zinc-500">Primary Language Context</label>
              <select
                value={f.language}
                onChange={(e) => set("language", e.target.value)}
                disabled={busy}
                className="bg-zinc-900/60 border border-white/5 focus:border-emerald-500/60 text-sm text-zinc-100 px-4 py-3 rounded-xl outline-none cursor-pointer w-full font-medium"
              >
                {["ARABIC", "SWAHILI", "ENGLISH", "URDU", "OTHER"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic real-time upload track state monitoring block */}
          {busy && (
            <div className="w-full bg-zinc-900/80 border border-white/5 rounded-2xl p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2">
                <span className="inline-flex items-center gap-2">
                  <div className="w-2.5 h-2.5 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                  Streaming files to node servers...
                </span>
                <span className="font-mono text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-150 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Interface Feedback Reporting System Alerts */}
          {error && (
            <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/10 rounded-xl px-4 py-3 flex items-center gap-2">
              <i className="ti ti-alert-circle text-base" /> {error}
            </div>
          )}

          {/* Footer Interactive Actions Toolbars */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={submit}
              disabled={busy || !audioFile}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-xl border-0 cursor-pointer transition-colors shadow-md ml-auto"
            >
              <i className="ti ti-upload-cloud text-base" /> Commit & Publish Track
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}