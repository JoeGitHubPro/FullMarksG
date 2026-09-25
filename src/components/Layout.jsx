import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import WebsiteSupportFloat from "./WhatsAppFloat";

const Layout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfc]">
      <Header />
      <main
        className={
          isHome
            ? "flex-grow w-full max-w-none px-0 py-0"
            : "flex-grow container mx-auto px-3 sm:px-4 py-6 sm:py-8"
        }
      >
        <Outlet />
      </main>
      <Footer />
      <WebsiteSupportFloat />
    </div>
  );
};

export default Layout;
