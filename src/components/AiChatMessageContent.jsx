const parseInline = (text, strongClassName = "font-bold") => {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className={strongClassName}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
};

const AiChatMessageContent = ({
  content,
  isUser = false,
  className = "",
}) => {
  const lines = String(content || "").split("\n");
  const strongClassName = isUser ? "font-bold text-white" : "font-bold text-[#2e0854]";

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`gap-${index}`} className="h-1" />;
        }

        const numberedMatch = trimmed.match(/^(\d+[.)])\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex gap-2">
              <span className={`shrink-0 ${isUser ? "font-bold" : "font-semibold text-gray-500"}`}>
                {numberedMatch[1]}
              </span>
              <span className="min-w-0">
                {parseInline(numberedMatch[2], strongClassName)}
              </span>
            </div>
          );
        }

        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0">•</span>
              <span className="min-w-0">
                {parseInline(trimmed.replace(/^[-*•]\s+/, ""), strongClassName)}
              </span>
            </div>
          );
        }

        if (/^#{1,3}\s+/.test(trimmed)) {
          return (
            <p key={index} className="font-bold text-[#2e0854]">
              {parseInline(trimmed.replace(/^#{1,3}\s+/, ""), strongClassName)}
            </p>
          );
        }

        return (
          <p key={index} className="min-w-0">
            {parseInline(line, strongClassName)}
          </p>
        );
      })}
    </div>
  );
};

export default AiChatMessageContent;
