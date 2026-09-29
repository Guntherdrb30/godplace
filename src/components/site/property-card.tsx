import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { listingOperationLabel, listingPriceSuffix } from "@/lib/listings";

export function PropertyCard(props: {
  id: string;
  titulo: string;
  ciudad: string;
  estadoRegion: string;
  currency: string;
  priceCents: number;
  operationType: string;
  listingId: string;
  imageUrl?: string | null;
  agencyName?: string | null;
}) {
  return (
    <Link href={`/property/${props.id}?listing=${props.listingId}`} className="group block focus-visible:rounded-2xl">
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
          {props.agencyName ? (
            <div className="text-xs text-muted-foreground">Por {props.agencyName}</div>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {listingOperationLabel(props.operationType)}
          </div>
          <div className="mt-1 text-sm">
            <span className="font-medium text-foreground">
              {formatMoney(props.priceCents, props.currency)}
            </span>{" "}
            <span className="text-muted-foreground">{listingPriceSuffix(props.operationType)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
