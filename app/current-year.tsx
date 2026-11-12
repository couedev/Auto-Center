"use client";

import { useEffect, useState } from "react";

export default function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setYear(new Date().getFullYear()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return year;
}
