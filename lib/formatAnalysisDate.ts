export function formatAnalysisDate(value?: string | null) {
  if (!value) return "";

  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const normalized = hasTimeZone
    ? value
    : `${value.trim().replace(" ", "T")}+08:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
