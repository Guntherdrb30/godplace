import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

export function PropertyCard(props: {
  id: string;
  titulo: string;
  ciudad: string;
  estadoRegion: string;
  currency: string;
  pricePerNightCents: number;
  imageUrl?: string | null;
}) {
  return (
    <Link href={`/property/${props.id}`} className="group block focus-visible:rounded-2xl">
      <Card className="overflow-hidden rounded-2xl border bg-white/80 transition-shadow group-hover:shadow-suave">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
          <Image
            src={props.imageUrl || "/placeholder-propiedad.svg"}
            alt={`Imagen de ${props.titulo}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <CardHeader className="pb-2">
          <div className="line-clamp-1 font-medium text-foreground">{props.titulo}</div>
          <div className="text-sm text-muted-foreground">
            {props.ciudad}, {props.estadoRegion}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm">
            <span className="font-medium text-foreground">
              {formatMoney(props.pricePerNightCents, props.currency)}
            </span>{" "}
            <span className="text-muted-foreground">por noche</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
