"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { LottieRefCurrentProps } from "lottie-react";

type LottieModule = typeof import("lottie-react");

type EmptyCartAnimationProps = {
  className?: string;
  style?: CSSProperties;
};

export function EmptyCartAnimation({ className, style }: EmptyCartAnimationProps) {
  const [Lottie, setLottie] = useState<LottieModule["default"] | null>(null);
  const [animationData, setAnimationData] = useState<unknown | null>(null);
  const ref = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [mod, data] = await Promise.all([
        import("lottie-react"),
        fetch("/lottie/empty-cart.json").then((r) => r.json()),
      ]);
      if (!cancelled) {
        setLottie(() => mod.default);
        setAnimationData(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Lottie || !animationData) {
    return <div className={className} style={style} aria-hidden="true" />;
  }

  return (
    <Lottie
      lottieRef={ref}
      animationData={animationData}
      loop
      autoplay
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}
