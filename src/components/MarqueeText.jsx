import { useLayoutEffect, useRef, useState } from "react";

export default function MarqueeText({ text, className = "", speed = 24 }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [animation, setAnimation] = useState(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = textRef.current;
    if (!container || !content) return undefined;

    let frame;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const distance = Math.max(0, content.scrollWidth - container.clientWidth);
        const next = distance > 2
          ? { distance: Math.ceil(distance), duration: Math.max(7, distance / speed + 4) }
          : null;
        setAnimation((current) => (
          current?.distance === next?.distance && current?.duration === next?.duration
            ? current
            : next
        ));
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    document.fonts?.ready?.then(measure).catch(() => {});

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text, speed]);

  return (
    <span
      ref={containerRef}
      className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`}
      title={text}
    >
      <span
        ref={textRef}
        className={`block w-max max-w-none ${animation ? "noor-marquee-text" : "max-w-full truncate"}`}
        style={animation ? {
          "--noor-marquee-distance": `${animation.distance}px`,
          "--noor-marquee-duration": `${animation.duration}s`,
        } : undefined}
      >
        {text}
      </span>
    </span>
  );
}
