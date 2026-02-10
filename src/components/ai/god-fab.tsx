"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function GodFab(props: { onClick: () => void; label?: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Button
        type="button"
        onClick={props.onClick}
        className="h-12 rounded-full bg-marca-petroleo px-5 text-white shadow-suave hover:bg-[#003f48] focus-visible:ring-0"
        aria-label={`Abrir chat con ${props.label || "God"}`}
      >
        <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
        {props.label || "God"}
      </Button>
    </div>
  );
}
