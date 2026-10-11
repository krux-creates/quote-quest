import { type VariantProps, cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, Ref } from "react";

import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "@/components/ui/8bit/styles/retro.css";

export const buttonVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
    variant: {
      default: "bg-foreground",
      destructive: "bg-foreground",
      outline: "bg-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "",
      sm: "",
      lg: "",
      icon: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface BitButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

interface ButtonDecorationsProps {
  size: BitButtonProps["size"];
  variant: BitButtonProps["variant"];
}

function ButtonDecorations({ size, variant }: ButtonDecorationsProps) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none contents"
      data-slot="button-decorations"
    >
      {variant !== "ghost" && variant !== "link" && size !== "icon" && (
        <>
          {/* Pixelated border */}
          <span className="absolute top-[calc(var(--bit)*-1)] left-[var(--bit)] h-[var(--bit)] w-1/2 bg-foreground dark:bg-ring" />
          <span className="absolute top-[calc(var(--bit)*-1)] right-[var(--bit)] h-[var(--bit)] w-1/2 bg-foreground dark:bg-ring" />
          <span className="absolute bottom-[calc(var(--bit)*-1)] left-[var(--bit)] h-[var(--bit)] w-1/2 bg-foreground dark:bg-ring" />
          <span className="absolute bottom-[calc(var(--bit)*-1)] right-[var(--bit)] h-[var(--bit)] w-1/2 bg-foreground dark:bg-ring" />
          <span className="absolute top-0 left-0 size-[var(--bit)] bg-foreground dark:bg-ring" />
          <span className="absolute top-0 right-0 size-[var(--bit)] bg-foreground dark:bg-ring" />
          <span className="absolute bottom-0 left-0 size-[var(--bit)] bg-foreground dark:bg-ring" />
          <span className="absolute right-0 bottom-0 size-[var(--bit)] bg-foreground dark:bg-ring" />
          <span className="absolute top-[var(--bit)] left-[calc(var(--bit)*-1)] h-[calc(100%-var(--bit)*2)] w-[var(--bit)] bg-foreground dark:bg-ring" />
          <span className="absolute top-[var(--bit)] right-[calc(var(--bit)*-1)] h-[calc(100%-var(--bit)*2)] w-[var(--bit)] bg-foreground dark:bg-ring" />
          {variant !== "outline" && (
            <>
              {/* Top shadow */}
              <span className="absolute top-0 left-0 h-[var(--bit)] w-full bg-foreground/20" />
              <span className="absolute top-[var(--bit)] left-0 h-[var(--bit)] w-[calc(var(--bit)*2)] bg-foreground/20" />

              {/* Bottom shadow */}
              <span className="absolute bottom-0 left-0 h-[var(--bit)] w-full bg-foreground/20" />
              <span className="absolute right-0 bottom-[var(--bit)] h-[var(--bit)] w-[calc(var(--bit)*2)] bg-foreground/20" />
            </>
          )}
        </>
      )}

      {size === "icon" && (
        <>
          <span className="absolute top-0 left-0 h-[5px] w-full bg-foreground md:h-[var(--bit)] dark:bg-ring" />
          <span className="absolute bottom-0 h-[5px] w-full bg-foreground md:h-[var(--bit)] dark:bg-ring" />
          <span className="absolute top-1 -left-1 h-1/2 w-[5px] bg-foreground md:w-[var(--bit)] dark:bg-ring" />
          <span className="absolute bottom-1 -left-1 h-1/2 w-[5px] bg-foreground md:w-[var(--bit)] dark:bg-ring" />
          <span className="absolute top-1 -right-1 h-1/2 w-[5px] bg-foreground md:w-[var(--bit)] dark:bg-ring" />
          <span className="absolute -right-1 bottom-1 h-1/2 w-[5px] bg-foreground md:w-[var(--bit)] dark:bg-ring" />
        </>
      )}
    </span>
  );
}

function Button({
  asChild = false,
  children,
  className,
  font,
  size,
  variant,
  ...props
}: BitButtonProps) {
  const decorations = <ButtonDecorations size={size} variant={variant} />;

  return (
    <ShadcnButton
      {...props}
      className={cn(
        "rounded-none active:translate-y-1 transition-transform relative inline-flex items-center justify-center gap-1.5 border-none",
        size === "icon" && "mx-1 my-0",
        font !== "normal" && "retro",
        className
      )}
      size={size}
      variant={variant}
      asChild={asChild}
    >
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {decorations}
    </ShadcnButton>
  );
}

export { Button };
