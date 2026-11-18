"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Leaf, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Banner } from "@/lib/types";
import { imageSource } from "@/lib/shop";
export function HeroCarousel() {
  const banners =
    useQuery({ queryKey: ["banners"], queryFn: () => api<{ data: Banner[] }>("/banners") }).data?.data ?? [];
  const slides = banners.filter((b) => imageSource(b.image_url) && !(b.title === "Kebutuhan dapur, lebih dekat." && b.image_url.endsWith("/hero.webp")));
  const [ref, carousel] = useEmblaCarousel({ loop: true });
  const [active, setActive] = useState(0),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!carousel) return;
    const update = () => setActive(carousel.selectedScrollSnap());
    carousel.on("select", update);
    return () => {
      carousel.off("select", update);
    };
  }, [carousel]);
  useEffect(() => {
    if (!carousel || paused || !slides.length || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = setInterval(() => carousel.scrollNext(), 6500);
    return () => clearInterval(timer);
  }, [carousel, paused, slides.length]);
  return (
    <section
      className="fresh-hero"
      aria-label="Penawaran toko"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div ref={ref} className="embla-window">
        <div className="embla-track">
          <article className="fresh-slide">
            <div className="fresh-hero-art">
              <Image
                fill
                src="/hero.webp"
                alt="Beras, minyak goreng, telur, dan bumbu dapur"
                sizes="(max-width:650px) 100vw, 64vw"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className="fresh-hero-copy">
              <p className="fresh-eyebrow">
                <Sprout size={18} /> DARI PASAR KE DAPUR
              </p>
              <h1>
                Isi dapur,
                <br />
                <em>hemat selalu.</em>
              </h1>
              <p>
                Beras pilihan, bumbu harum, dan kebutuhan harian. Belanja eceran atau grosir dalam satu
                keranjang.
              </p>
              <Link className="store-cta" href="/produk">
                Belanja sekarang <ArrowRight size={16} />
              </Link>
            </div>
            <Leaf className="fresh-leaf leaf-one" aria-hidden />
            <Leaf className="fresh-leaf leaf-two" aria-hidden />
          </article>
          {slides.map((b) => (
            <article className="fresh-slide" key={b.id}>
              <div className="fresh-hero-art">
                <Image
                  fill
                  sizes="(max-width:650px) 100vw, 64vw"
                  unoptimized={!b.image_url.startsWith("/")}
                  src={imageSource(b.image_url)!}
                  alt=""
                />
              </div>
              <div className="fresh-hero-copy">
                <p className="fresh-eyebrow">~ Pilihan toko ~</p>
                <h2>{b.title}</h2>
                <Link className="store-cta" href={imageSource(b.link_url) || "/produk"}>
                  Belanja sekarang <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
      {slides.length > 0 && (
        <div className="hero-controls">
          <button aria-label="Banner sebelumnya" onClick={() => carousel?.scrollPrev()}>
            <ChevronLeft />
          </button>
          {[0, ...slides.map((b) => b.id)].map((id, i) => (
            <button
              key={id}
              aria-label={"Banner " + (i + 1)}
              aria-pressed={i === active}
              onClick={() => carousel?.scrollTo(i)}
            >
              •
            </button>
          ))}
          <button aria-label="Banner berikutnya" onClick={() => carousel?.scrollNext()}>
            <ChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
