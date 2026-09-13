import { Mail, Linkedin, Github } from "lucide-react";

interface DevelopedByProps {
  className?: string;
  variant?: "full" | "compact";
}

export function DevelopedBy({ className = "", variant = "full" }: DevelopedByProps) {
  if (variant === "compact") {
    return (
      <div className={`border-t border-border/40 pt-4 text-xs text-muted-foreground ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-primary font-medium block">
              Developed by
            </span>
            <span className="text-foreground font-semibold text-xs">Megh R. Patel</span>
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">Branch / Year: CO 3rd</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="mailto:meghpatel.co24d2@scet.ac.in"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
              aria-label="Email Megh R. Patel at meghpatel.co24d2@scet.ac.in"
            >
              <Mail className="h-3 w-3 text-primary" />
              <span>meghpatel.co24d2@scet.ac.in</span>
            </a>

            <a
              href="https://www.linkedin.com/in/megh-patel-18900a318/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
              aria-label="LinkedIn profile of Megh Patel"
            >
              <Linkedin className="h-3 w-3 text-primary" />
              <span>Megh Patel</span>
            </a>

            <a
              href="https://github.com/megh1407"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
              aria-label="View the Core Quest Finder GitHub repository"
            >
              <Github className="h-3 w-3 text-primary" />
              <span className="font-mono">megh1407</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`border-t border-border/60 pt-6 pb-2 text-xs text-muted-foreground ${className}`}
      aria-label="Developer Information"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-primary">
            Developed by
          </p>
          <h3 className="mt-1 font-display text-sm font-bold text-foreground text-glow">
            Megh R. Patel
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            Branch / Year: <span className="text-foreground/90">CO 3rd</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
          <a
            href="mailto:meghpatel.co24d2@scet.ac.in"
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5"
            aria-label="Send email to meghpatel.co24d2@scet.ac.in"
          >
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px]">meghpatel.co24d2@scet.ac.in</span>
          </a>

          <a
            href="https://www.linkedin.com/in/megh-patel-18900a318/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5"
            aria-label="View Megh Patel's LinkedIn Profile"
          >
            <Linkedin className="h-3.5 w-3.5 text-primary" />
            <span>Megh Patel</span>
          </a>

          <a
            href="https://github.com/megh1407"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5"
            aria-label="View the Core Quest Finder GitHub repository"
          >
            <Github className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono">megh1407</span>
          </a>
        </div>
      </div>
    </section>
  );
}
