import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const AUTO_ADVANCE_MS = 5000;

/** A rotating full-bleed hero banner — auto-advances, loops, shows dot indicators.
 * Renders nothing when there are fewer than 2 images (a single image is just a static banner,
 * no carousel controls needed). */
export function HeroCarousel({ images, className }: { images: string[]; className?: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api || images.length < 2) return;
    const id = setInterval(() => api.scrollNext(), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [api, images.length]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt=""
        className={className ?? "absolute inset-0 h-full w-full object-cover"}
      />
    );
  }

  return (
    <div className={className ?? "absolute inset-0 h-full w-full"}>
      {/* [&>div] / [&>div>div] reach past CarouselContent's own non-customizable
          "overflow-hidden" wrapper div, which otherwise stays height:auto and collapses
          the whole carousel instead of filling this hero. */}
      <Carousel
        opts={{ loop: true }}
        setApi={setApi}
        className="h-full w-full [&>div]:h-full [&>div>div]:h-full"
      >
        <CarouselContent className="ml-0 h-full">
          {images.map((src, i) => (
            <CarouselItem key={`${src}-${i}`} className="h-full pl-0">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === current ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
