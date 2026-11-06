import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollTo } from '@/hooks/useLenis';

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // If not an anchor link, scroll to top on pathname change
    if (!window.location.hash) {
      scrollTo(0, { duration: 0.1 });
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
