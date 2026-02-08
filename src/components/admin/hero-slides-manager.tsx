"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AdminHeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  imageUrl: string;
  imagePathname: string;
  orden: number;
  active: boolean;
};

async function subirImagen(file: File): Promise<{ url: string; pathname: string }> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("folder", "site");
  fd.set("entityId", "hero");

  const up = await fetch("/api/blob/upload", { method: "POST", body: fd });
  const upData = await up.json().catch(() => ({}));
  if (!up.ok) {
    throw new Error(upData?.message || "No se pudo subir la imagen.");
  }
  return { url: upData.url, pathname: upData.pathname };
}

export function HeroSlidesManager(props: { initialSlides: AdminHeroSlide[] }) {
  const [slides, setSlides] = React.useState<AdminHeroSlide[]>(
    props.initialSlides.slice().sort((a, b) => a.orden - b.orden),
  );
  const [openCreate, setOpenCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [ctaText, setCtaText] = React.useState("");
  const [ctaHref, setCtaHref] = React.useState("");
  const [orden, setOrden] = React.useState<string>("");
  const [active, setActive] = React.useState(true);

  const [openEdit, setOpenEdit] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<AdminHeroSlide | null>(null);

  const resetCreate = () => {
    setFile(null);
    setTitle("");
    setSubtitle("");
    setCtaText("");
    setCtaHref("");
    setOrden("");
    setActive(true);
  };

  const crear = async () => {
    if (!file) {
      toast("Selecciona una imagen.");
      return;
    }
    setCreating(true);
    try {
      const up = await subirImagen(file);
      const res = await fetch("/api/admin/hero_slides/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          subtitle: subtitle.trim() || undefined,
          ctaText: ctaText.trim() || undefined,
          ctaHref: ctaHref.trim() || undefined,
          imageUrl: up.url,
          imagePathname: up.pathname,
          orden: orden.trim() ? Number.parseInt(orden, 10) : undefined,
          active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo crear el slide.", { description: data?.message || "" });
        return;
      }
      const slide: AdminHeroSlide = {
        id: data.slide.id,
        title: data.slide.title,
        subtitle: data.slide.subtitle,
        ctaText: data.slide.ctaText,
        ctaHref: data.slide.ctaHref,
        imageUrl: data.slide.imageUrl,
        imagePathname: data.slide.imagePathname,
        orden: data.slide.orden,
        active: data.slide.active,
      };
      setSlides((s) => [...s, slide].slice().sort((a, b) => a.orden - b.orden));
      toast("Slide creado.");
      setOpenCreate(false);
      resetCreate();
    } catch (e) {
      toast("No se pudo crear el slide.", { description: e instanceof Error ? e.message : "" });
    } finally {
      setCreating(false);
    }
  };

  const abrirEdicion = (s: AdminHeroSlide) => {
    setEditTarget(s);
    setOpenEdit(true);
  };

  const guardarEdicion = async () => {
    if (!editTarget) return;
    setEditing(true);
    try {
      const res = await fetch("/api/admin/hero_slides/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          title: editTarget.title,
          subtitle: editTarget.subtitle,
          ctaText: editTarget.ctaText,
          ctaHref: editTarget.ctaHref,
          orden: editTarget.orden,
          active: editTarget.active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo guardar.", { description: data?.message || "" });
        return;
      }
      setSlides((arr) => arr.slice().sort((a, b) => a.orden - b.orden));
      toast("Cambios guardados.");
      setOpenEdit(false);
      setEditTarget(null);
    } finally {
      setEditing(false);
    }
  };

  const eliminar = async (id: string) => {
    const target = slides.find((s) => s.id === id);
    if (!target) return;
    if (!confirm("¿Eliminar este slide?")) return;

    const res = await fetch("/api/admin/hero_slides/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast("No se pudo eliminar.", { description: data?.message || "" });
      return;
    }

    setSlides((arr) => arr.filter((x) => x.id !== id));
    toast("Slide eliminado.");
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl bg-white/85 shadow-suave">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Hero: Carrusel de imágenes</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Estas imágenes y textos se muestran en el carrusel del inicio (/). Se suben a Vercel Blob.
            </p>
          </div>
          <Dialog open={openCreate} onOpenChange={(v) => (setOpenCreate(v), v ? null : resetCreate())}>
            <DialogTrigger asChild>
              <Button className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90">Agregar slide</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Agregar slide</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="hero-file">Imagen</Label>
                  <Input
                    id="hero-file"
                    type="file"
                    accept="image/*"
                    disabled={creating}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Recomendado: horizontal, buena resolución, sin texto excesivo.</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="hero-title">Título (opcional)</Label>
                  <Input id="hero-title" value={title} disabled={creating} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="hero-subtitle">Subtítulo (opcional)</Label>
                  <Textarea
                    id="hero-subtitle"
                    rows={3}
                    value={subtitle}
                    disabled={creating}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="hero-ctaText">CTA (texto)</Label>
                    <Input
                      id="hero-ctaText"
                      value={ctaText}
                      disabled={creating}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Ej: Explorar propiedades"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hero-ctaHref">CTA (link)</Label>
                    <Input
                      id="hero-ctaHref"
                      value={ctaHref}
                      disabled={creating}
                      onChange={(e) => setCtaHref(e.target.value)}
                      placeholder="Ej: /search"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="hero-orden">Orden (opcional)</Label>
                    <Input
                      id="hero-orden"
                      inputMode="numeric"
                      value={orden}
                      disabled={creating}
                      onChange={(e) => setOrden(e.target.value)}
                      placeholder="Ej: 0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Activo</Label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={creating}
                        onChange={(e) => setActive(e.target.checked)}
                      />
                      Mostrar en el carrusel
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" disabled={creating} onClick={() => setOpenCreate(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" disabled={creating} onClick={() => void crear()}>
                    {creating ? "Creando..." : "Crear"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">No hay slides todavía.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slides
                    .slice()
                    .sort((a, b) => a.orden - b.orden)
                    .map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="relative h-16 w-24 overflow-hidden rounded-md bg-secondary/40">
                            <Image src={s.imageUrl} alt={s.title || "Slide"} fill className="object-cover" sizes="96px" />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[340px]">
                          <div className="truncate font-medium">{s.title || "(Sin título)"}</div>
                          <div className="truncate text-xs text-muted-foreground">{s.subtitle || ""}</div>
                        </TableCell>
                        <TableCell>{s.orden}</TableCell>
                        <TableCell>
                          <span className={s.active ? "text-foreground" : "text-muted-foreground"}>
                            {s.active ? "Sí" : "No"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => abrirEdicion(s)}>
                              Editar
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void eliminar(s.id)}>
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openEdit} onOpenChange={(v) => (setOpenEdit(v), v ? null : setEditTarget(null))}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Editar slide</DialogTitle>
          </DialogHeader>

          {!editTarget ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-start">
                <div className="relative aspect-[16/11] overflow-hidden rounded-xl border bg-secondary/40">
                  <Image src={editTarget.imageUrl} alt={editTarget.title || "Slide"} fill className="object-cover" />
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-title">Título</Label>
                    <Input
                      id="edit-title"
                      value={editTarget.title ?? ""}
                      disabled={editing}
                      onChange={(e) => setEditTarget((t) => (t ? { ...t, title: e.target.value || null } : t))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-subtitle">Subtítulo</Label>
                    <Textarea
                      id="edit-subtitle"
                      rows={3}
                      value={editTarget.subtitle ?? ""}
                      disabled={editing}
                      onChange={(e) => setEditTarget((t) => (t ? { ...t, subtitle: e.target.value || null } : t))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-ctaText">CTA (texto)</Label>
                  <Input
                    id="edit-ctaText"
                    value={editTarget.ctaText ?? ""}
                    disabled={editing}
                    onChange={(e) => setEditTarget((t) => (t ? { ...t, ctaText: e.target.value || null } : t))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-ctaHref">CTA (link)</Label>
                  <Input
                    id="edit-ctaHref"
                    value={editTarget.ctaHref ?? ""}
                    disabled={editing}
                    onChange={(e) => setEditTarget((t) => (t ? { ...t, ctaHref: e.target.value || null } : t))}
                    placeholder="/search"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-orden">Orden</Label>
                  <Input
                    id="edit-orden"
                    type="number"
                    min={0}
                    value={String(editTarget.orden)}
                    disabled={editing}
                    onChange={(e) =>
                      setEditTarget((t) =>
                        t ? { ...t, orden: Number.parseInt(e.target.value || "0", 10) || 0 } : t,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Activo</Label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editTarget.active}
                      disabled={editing}
                      onChange={(e) => setEditTarget((t) => (t ? { ...t, active: e.target.checked } : t))}
                    />
                    Mostrar en el carrusel
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border bg-white/70 p-4 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Blob</div>
                <div className="mt-1 break-all">
                  <span className="font-medium">pathname:</span> {editTarget.imagePathname}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={editing} onClick={() => setOpenEdit(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={editing} onClick={() => void guardarEdicion()}>
                  {editing ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

