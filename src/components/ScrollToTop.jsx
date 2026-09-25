import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToSection, scrollToTop } from "../utils/scroll";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const timer = setTimeout(() => scrollToSection(id), 80);
      return () => clearTimeout(timer);
    }

    scrollToTop();
  }, [pathname, hash]);

  useEffect(() => {
    const handleClick = (event) => {
      const link = event.target.closest('a[href^="#"]');
      const button = event.target.closest("[data-scroll-to]");

      let targetId = null;
      if (link) {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        targetId = href.slice(1);
      } else if (button) {
        targetId = button.getAttribute("data-scroll-to");
      }

      if (!targetId || !document.getElementById(targetId)) return;

      event.preventDefault();
      scrollToSection(targetId);
      window.history.pushState(null, "", `#${targetId}`);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
};

export default ScrollToTop;
