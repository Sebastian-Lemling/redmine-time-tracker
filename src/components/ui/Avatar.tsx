interface Props {
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#d3e3fd", fg: "#041e49" }, // blue
  { bg: "#fdd835", fg: "#3e2723" }, // amber
  { bg: "#c8e6c9", fg: "#1b5e20" }, // green
  { bg: "#f8bbd0", fg: "#880e4f" }, // pink
  { bg: "#d1c4e9", fg: "#311b92" }, // purple
  { bg: "#ffe0b2", fg: "#e65100" }, // orange
  { bg: "#b2dfdb", fg: "#004d40" }, // teal
  { bg: "#ffccbc", fg: "#bf360c" }, // deep-orange
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 28 }: Props) {
  const initials = getInitials(name);
  const color = colorForName(name);
  const fontSize = Math.round(size * 0.39);

  return (
    <div
      className="ticket-avatar"
      title={name}
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: color.bg,
        color: color.fg,
      }}
    >
      {initials}
    </div>
  );
}
