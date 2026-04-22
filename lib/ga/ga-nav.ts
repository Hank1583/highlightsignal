import {
  LayoutDashboard,
  LineChart,
  Brain,
  Megaphone,
  FileText,
  Target,
  Mail,
  Settings,
} from "lucide-react";

export const gaNavItems = [
  {
    group: "GA 數據",
    items: [
      {
        title: "總覽",
        desc: "核心流量與成效",
        href: "/ga",
        icon: LayoutDashboard,
      },
      {
        title: "趨勢分析",
        desc: "每日變化與成長",
        href: "/ga/trend",
        icon: LineChart,
      },
      {
        title: "AI 洞察",
        desc: "異常與下一步建議",
        href: "/ga/insights",
        icon: Brain,
      },
    ],
  },
  {
    group: "成效分析",
    items: [
      {
        title: "流量分析",
        desc: "來源、媒介與活動",
        href: "/ga/traffic",
        icon: Megaphone,
      },
      {
        title: "頁面分析",
        desc: "內容表現與入口頁",
        href: "/ga/pages",
        icon: FileText,
      },
      {
        title: "轉換分析",
        desc: "事件、目標與成交",
        href: "/ga/conversions",
        icon: Target,
      },
    ],
  },
  {
    group: "報表設定",
    items: [
      {
        title: "報表",
        desc: "儲存與編輯報表",
        href: "/ga/report",
        icon: Mail,
      },
      {
        title: "帳戶設定",
        desc: "GA 連線與資料來源",
        href: "/ga/account",
        icon: Settings,
      },
    ],
  },
] as const;
