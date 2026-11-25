// Avatar berbentuk bunga, terinspirasi dari referensi desain.
export default function Avatar({ name = "U", size = 44 }) {
  const letter = (name || "U").trim()[0]?.toUpperCase() || "U";
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="avatar-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#bba9ff" />
            <stop offset="1" stopColor="#6a47ea" />
          </linearGradient>
        </defs>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={50 + 27 * Math.cos(a)}
              cy={50 + 27 * Math.sin(a)}
              r="19"
              fill="url(#avatar-grad)"
            />
          );
        })}
        <circle cx="50" cy="50" r="30" fill="url(#avatar-grad)" />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-extrabold text-white"
        style={{ fontSize: size * 0.38 }}
      >
        {letter}
      </span>
    </div>
  );
}
