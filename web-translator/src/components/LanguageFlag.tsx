import type React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { getLanguageCountryCode } from '../utils/languages';

const FLAGS = Flags as Record<string, React.ComponentType<React.SVGAttributes<SVGSVGElement> & { title?: string }>>;

interface LanguageFlagProps {
  languageCode: string;
  title?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export function LanguageFlag({ languageCode, title, width = 20, height = 14, style }: LanguageFlagProps) {
  const country = getLanguageCountryCode(languageCode);
  if (!country) return null;

  const FlagComponent = FLAGS[country.toUpperCase()];
  if (!FlagComponent) return null;

  return (
    <span style={{ display: 'inline-flex', verticalAlign: 'middle', ...style }} aria-hidden>
      <FlagComponent
        title={title ?? undefined}
        width={width}
        height={height}
        style={{ borderRadius: 2, flexShrink: 0 }}
      />
    </span>
  );
}
