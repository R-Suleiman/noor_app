export default function Avatar({ name, url, size = "md", bg = "bg-emerald-800", className = "" }) {
  const sz = { sm:"w-8 h-8 text-sm", md:"w-11 h-11 text-base", lg:"w-20 h-20 text-2xl", xl:"w-28 h-28 text-4xl" }[size];
  if (url) return <img src={url} className={`${sz} rounded-full object-cover flex-shrink-0 ${className}`} alt={name} />;
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white/90 flex-shrink-0 ${bg} ${className}`} style={{fontFamily:"'Cinzel',serif"}}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
