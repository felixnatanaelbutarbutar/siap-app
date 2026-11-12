import logoWhite from '../assets/logo-white.png';
import logoDark from '../assets/logo-dark.png';
import emblemWhite from '../assets/emblem-white.png';
import emblemDark from '../assets/emblem-dark.png';
import emblemAccent from '../assets/emblem-accent.png';

interface BrandLogoProps {
  variant?: 'wordmark' | 'emblem';
  tone?: 'auto' | 'white' | 'dark' | 'accent';
  className?: string;
  alt?: string;
}

export function BrandLogo({
  variant = 'wordmark',
  tone = 'auto',
  className = 'h-7 w-auto',
  alt = 'SIAP Logo',
}: BrandLogoProps) {
  if (variant === 'emblem') {
    if (tone === 'accent') {
      return (
        <img
          src={emblemAccent}
          alt={alt}
          className={`object-contain select-none ${className}`}
          draggable={false}
        />
      );
    }
    if (tone === 'white') {
      return (
        <img
          src={emblemWhite}
          alt={alt}
          className={`object-contain select-none ${className}`}
          draggable={false}
        />
      );
    }
    if (tone === 'dark') {
      return (
        <img
          src={emblemDark}
          alt={alt}
          className={`object-contain select-none ${className}`}
          draggable={false}
        />
      );
    }
    return (
      <>
        <img
          src={emblemWhite}
          alt={alt}
          className={`hidden dark:block object-contain select-none ${className}`}
          draggable={false}
        />
        <img
          src={emblemDark}
          alt={alt}
          className={`block dark:hidden object-contain select-none ${className}`}
          draggable={false}
        />
      </>
    );
  }

  if (tone === 'white') {
    return (
      <img
        src={logoWhite}
        alt={alt}
        className={`object-contain select-none ${className}`}
        draggable={false}
      />
    );
  }

  if (tone === 'dark') {
    return (
      <img
        src={logoDark}
        alt={alt}
        className={`object-contain select-none ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <>
      <img
        src={logoWhite}
        alt={alt}
        className={`hidden dark:block object-contain select-none ${className}`}
        draggable={false}
      />
      <img
        src={logoDark}
        alt={alt}
        className={`block dark:hidden object-contain select-none ${className}`}
        draggable={false}
      />
    </>
  );
}

