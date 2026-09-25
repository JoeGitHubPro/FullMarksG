export const normalizePhone = (phone) => {
  if (phone == null || phone === "") return null;

  let digits = String(phone).trim().replace(/[\s\-]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("01")) {
    digits = `201${digits.slice(2)}`;
  }

  if (!digits.startsWith("201") || digits.length < 12) {
    return null;
  }

  return `+${digits}`;
};

export const isPhoneNumber = (input) =>
  /^\+?\d+$/.test(String(input || "").replace(/[\s\-]/g, ""));

export const toWhatsAppPhone = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return normalized.slice(1);
};

export const WHATSAPP_SUPPORT_NUMBER = "01042040481";

export const getWhatsAppUrl = (phone = WHATSAPP_SUPPORT_NUMBER) => {
  const whatsappPhone = toWhatsAppPhone(phone);
  return whatsappPhone ? `https://wa.me/${whatsappPhone}` : null;
};
