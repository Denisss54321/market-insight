'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ThemeProvider() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname === '/builds') {
      document.documentElement.setAttribute('data-theme', 'builds');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [pathname]);

  return null;
}
