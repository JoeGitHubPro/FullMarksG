import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const NavigationLoader = () => {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#fdfdfc]/60 pointer-events-none">
      <div
        className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading page"
      />
    </div>
  );
};

export default NavigationLoader;
