import {
  LayoutDashboard,
  LineChart,
  Brain,
  Megaphone,
  FileText,
  ListFilter,
  Target,
  Mail,
  Settings,
} from "lucide-react";

export const gaNavItems = [
  {
    group: "網站成效",
    items: [
      {
        title: "決策總覽",
        desc: "摘要、建議與下一步",
        href: "/ga",
        icon: LayoutDashboard,
      },
      {
        title: "成效趨勢",
        desc: "造訪與成果的變化證據",
        href: "/ga/trend",
        icon: LineChart,
      },
      {
        title: "成效建議",
        desc: "待確認的異常與改善方向",
        href: "/ga/insights",
        icon: Brain,
      },
    ],
  },
  {
    group: "深入證據",
    items: [
      {
        title: "訪客來源",
        desc: "來源、媒介與活動證據",
        href: "/ga/traffic",
        icon: Megaphone,
      },
      {
        title: "內容成效",
        desc: "內容表現與入口頁證據",
        href: "/ga/pages",
        icon: FileText,
      },
      {
        title: "關鍵成果",
        desc: "事件、目標與成交證據",
        href: "/ga/conversions",
        icon: Target,
      },
      {
        title: "轉換歷程",
        desc: "完成步驟與流失位置",
        href: "/ga/funnel",
        icon: ListFilter,
      },
    ],
  },
  {
    group: "報告與資料",
    items: [
      {
        title: "報表",
        desc: "定期輸出與儲存報告",
        href: "/ga/report",
        icon: Mail,
      },
      {
        title: "資料來源",
        desc: "Google Analytics 連線設定",
        href: "/ga/account",
        icon: Settings,
      },
    ],
  },
] as const;
