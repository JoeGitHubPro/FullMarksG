const BrandLogo = ({ className = "text-xl", variant = "default" }) => (
  <span
    className={`font-black tracking-tight font-heading ${className} ${
      variant === "light" ? "text-white" : "text-brand"
    }`}
  >
    Full
    <span className="text-brand-orange">Marks</span>
  </span>
);

export default BrandLogo;
