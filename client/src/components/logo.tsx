import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <h1 
      className={cn(
        "font-serif text-2xl font-light tracking-wide text-black italic",
        className
      )}
    >
      The Tasks
    </h1>
  );
}
