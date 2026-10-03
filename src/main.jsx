import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import { FeedbackProvider } from "./context/FeedbackContext.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import NavigationLoader from "./components/NavigationLoader.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <NavigationLoader />
      <AuthProvider>
        <LanguageProvider>
          {/* Mounted once here so any page can style its confirms/alerts via
              useConfirm()/useToast() instead of window.confirm()/alert(). */}
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
