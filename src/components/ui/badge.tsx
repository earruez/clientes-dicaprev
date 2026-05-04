"use client";

import * as React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: string;
};

export function Badge({ variant, ...props }: BadgeProps) {
  void variant;
  return <span {...props} />;
}
