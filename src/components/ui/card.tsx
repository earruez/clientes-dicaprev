"use client";

import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card(props: DivProps) {
  return <div {...props} />;
}

export function CardHeader(props: DivProps) {
  return <div {...props} />;
}

export function CardContent(props: DivProps) {
  return <div {...props} />;
}
