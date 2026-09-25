export const scrollToSection = (id, options = {}) => {
  if (!id) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  const scrollParent = el.closest("[data-scroll-container]");
  const offset = options.offset ?? 16;

  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = scrollParent.scrollTop + (elRect.top - parentRect.top) - offset;
    scrollParent.scrollTo({ top, behavior: "smooth" });
  } else {
    const top = window.scrollY + el.getBoundingClientRect().top - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return true;
};

export const scrollToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelector("[data-scroll-container]")?.scrollTo(0, 0);
};
