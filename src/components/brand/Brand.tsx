import Image from "next/image";

type BrandProps = {
  className?: string;
};

export function Brand({ className = "" }: BrandProps) {
  return (
    <a
      className={`brand ${className}`.trim()}
      href="#inicio"
      aria-label="IMPROVE, início"
    >
      <Image
        src="/brand/improve-symbol-transparent.png"
        alt=""
        width="44"
        height="44"
        unoptimized
        priority
      />
      
      <span>IMPROVE</span>
    </a>
  );
}
