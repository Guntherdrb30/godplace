"use client";

import { Trash2, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/tour3d/upload-config";
import type { TourUploadFile } from "@/types/tour3d";

export function FilePreview(props: {
  item: TourUploadFile;
  onRemove: (id: string) => void;
}) {
  const isVideo = props.item.type.startsWith("video/");
  const label = isVideo ? "Video" : "Imagen";

  return (
    <div className="overflow-hidden rounded-3xl border bg-white/90 shadow-suave">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        {isVideo ? (
          <video
            controls
            className="h-full w-full object-cover"
            src={props.item.previewUrl}
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.item.previewUrl}
              alt={props.item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </>
        )}

        <div className="absolute left-4 top-4">
          <Badge variant="secondary" className="border border-white/30 bg-black/45 text-white">
            {isVideo ? <Video className="mr-1 h-3.5 w-3.5" /> : <ImageIcon className="mr-1 h-3.5 w-3.5" />}
            {label}
          </Badge>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-foreground">{props.item.name}</p>
          <p className="text-xs text-muted-foreground">{props.item.type}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(props.item.size)}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => props.onRemove(props.item.id)}
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
