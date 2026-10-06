"use client";
import { useEffect } from "react";
import { safeNextPath } from "@/lib/authRedirect";
export default function ReturnToGame({ next }: { next: string }) {
  useEffect(() => { window.location.replace(safeNextPath(next)); }, [next]);
  return <a href={safeNextPath(next)}>Revenir à la partie</a>;
}
