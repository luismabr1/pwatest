"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallback: string;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, className, fallback }) => {
  const [imageSrc, setImageSrc] = useState(src || fallback); // Default to fallback if src is empty
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Skip if no src provided
    if (!src) {
      setIsLoading(false);
      setError(true);
      setImageSrc(fallback);
      if (process.env.NODE_ENV === "development") {
        console.warn("ImageWithFallback: No src provided, using fallback");
      }
      return;
    }

    setIsLoading(true);
    setError(false);
    setImageSrc(src);

    // Use native Image constructor directly with runtime check
    const img = typeof window !== "undefined" ? new window.Image() : new Image(); // Ensure native Image
    img.src = src;
    img.onload = () => {
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
      setError(true);
      setImageSrc(fallback);
      if (process.env.NODE_ENV === "development") {
        console.error(`Error loading image: ${src}`);
      }
    };

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallback]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      width={160}
      height={error ? 96 : 64}
      onError={() => {
        setImageSrc(fallback);
        setError(true);
      }}
    />
  );
};

export default ImageWithFallback;
