"use client";

import * as React from "react";

type ProgressProps = React.ProgressHTMLAttributes<HTMLProgressElement>;

export function Progress(props: ProgressProps) {
  return <progress {...props} />;
}
