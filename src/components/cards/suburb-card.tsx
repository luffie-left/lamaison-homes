import Image from "next/image";
import Link from "next/link";

// Free Unsplash photos for Melbourne landmarks
// All are free for commercial use, no attribution required
const SUBURB_PHOTOS: Record<string, string> = {
  "CBD":         "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=800&q=80", // Flinders St Station
  "Southbank":   "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80", // Southbank waterfront
  "Docklands":   "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80", // Melbourne waterfront
  "Fitzroy":     "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=800&q=80", // Melbourne laneways
  "South Yarra": "https://images.unsplash.com/photo-1577086664693-894d8405334a?w=800&q=80", // Chapel St
  "St Kilda":    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80", // St Kilda pier/beach
  "Richmond":    "https://images.unsplash.com/photo-1555476618-b5bd70e49ede?w=800&q=80", // Melbourne street
  "Carlton":     "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=800&q=80", // Melbourne laneways
  "Melbourne":   "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=800&q=80",
  "Box Hill":    "https://images.unsplash.com/photo-1577086664693-894d8405334a?w=800&q=80",
};

const FALLBACK = "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=800&q=80";

export function SuburbCard({ name }: { name: string }) {
  const photo = SUBURB_PHOTOS[name] ?? FALLBACK;

  return (
    <Link
      href={`/stays?loc=${encodeURIComponent(name)}`}
      className="group relative block rounded-[24px] overflow-hidden aspect-[4/3] shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
    >
      <Image
        src={photo}
        alt={name}
        fill
        className="object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute bottom-4 left-4">
        <p className="text-white font-medium text-base">{name}</p>
        <p className="text-white/60 text-xs mt-0.5 group-hover:text-white/90 transition-colors">View stays →</p>
      </div>
    </Link>
  );
}
