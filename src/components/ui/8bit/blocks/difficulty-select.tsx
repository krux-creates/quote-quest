"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/8bit/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit/card";

export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultySelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: Difficulty;
  defaultValue?: Difficulty;
  onChange?: (value: Difficulty) => void;
  title?: string;
  description?: string;
  vertical?: boolean;
  /** Which levels to offer, and what to call them. */
  options?: Difficulty[];
  labels?: Partial<Record<Difficulty, string>>;
}

export default function DifficultySelect({
  className,
  value,
  defaultValue = "normal",
  onChange,
  title = "Select Difficulty",
  description,
  vertical = true,
  options = ["easy", "normal", "hard"],
  labels,
  ...props
}: DifficultySelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] =
    React.useState<Difficulty>(defaultValue);

  const selected = isControlled ? (value as Difficulty) : internalValue;

  const setSelected = React.useCallback(
    (next: Difficulty) => {
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader className="flex flex-col items-center justify-center gap-4">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div
          className={cn("gap-4", vertical ? "flex flex-col" : "flex flex-row")}
        >
          {options.map((level) => (
            <Button
              key={level}
              className="flex flex-1 items-center justify-center"
              variant={selected === level ? "default" : "secondary"}
              aria-pressed={selected === level}
              onClick={() => setSelected(level)}
            >
              {labels?.[level] ?? level.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
