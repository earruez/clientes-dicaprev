// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// export nombrado
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// export default (por si algún archivo lo importa como default)
export default cn
