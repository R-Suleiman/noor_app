export default function Spinner({ sm }) {
  const sz = sm ? "w-4 h-4 border" : "w-5 h-5 border-2";
  return <div className={`${sz} border-white/20 border-t-emerald-400 rounded-full animate-spin`} />;
}
