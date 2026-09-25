import { useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { HiOutlineSparkles, HiOutlineX } from "react-icons/hi";
import { getWhatsAppUrl, WHATSAPP_SUPPORT_NUMBER } from "../utils/phone";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import AiChatPanel from "./AiChatPanel";

const WebsiteSupportFloat = () => {
  const { t } = useTranslation();
  const whatsappUrl = getWhatsAppUrl(WHATSAPP_SUPPORT_NUMBER);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await api.getAiStatus();
        if (res.success) {
          setAiEnabled(!!res.data?.enabled);
        }
      } catch (err) {
        console.error("Failed to load AI chatbot status", err);
      }
    };

    loadStatus();
  }, []);

  useEffect(() => {
    if (!showAiPanel) return undefined;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowAiPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAiPanel]);

  if (!whatsappUrl) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 end-6 z-50 flex flex-col items-end gap-3"
    >
      {showAiPanel && (
        aiEnabled ? (
          <div className="relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setShowAiPanel(false)}
              className="absolute -top-2 -start-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 shadow-md transition-colors hover:text-gray-700"
              aria-label={t("support.close")}
            >
              <HiOutlineX className="text-sm" />
            </button>
            <AiChatPanel compact />
          </div>
        ) : (
          <div className="w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl shadow-brand/10 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-brand-purple">
                  <HiOutlineSparkles className="text-xl" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#2e0854] font-heading">
                    {t("support.aiTitle")}
                  </h3>
                  <p className="text-xs font-light leading-relaxed text-gray-500">
                    {t("support.aiDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPanel(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                aria-label={t("support.close")}
              >
                <HiOutlineX className="text-base" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAiPanel(false)}
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
            >
              {t("support.gotIt")}
            </button>
          </div>
        )
      )}

      <button
        type="button"
        onClick={() => setShowAiPanel((open) => !open)}
        aria-label={aiEnabled ? t("support.aiLabelLive") : t("support.aiLabel")}
        aria-expanded={showAiPanel}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2e0854] text-white shadow-lg shadow-brand/20 transition-transform hover:scale-105 active:scale-95"
      >
        <HiOutlineSparkles className="text-2xl" />
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("support.whatsapp")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 active:scale-95"
      >
        <FaWhatsapp className="text-3xl" />
      </a>
    </div>
  );
};

export default WebsiteSupportFloat;
