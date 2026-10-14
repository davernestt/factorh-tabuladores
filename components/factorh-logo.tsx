import Image from "next/image";

export default function FactoRHLogo({
  className = "h-10 w-auto",
  full = false,
  priority = false,
}: {
  className?: string;
  full?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={full ? "/brand/factorh-logo.svg" : "/brand/factorh-wordmark.svg"}
      alt="FactoRH"
      width={475}
      height={130}
      className={className}
      priority={priority}
    />
  );
}
