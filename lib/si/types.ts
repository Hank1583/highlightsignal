export type SiModule = "aeo" | "geo";

export type SiMetric = {
  label: string;
  value: string;
  note?: string;
  basis?: string;
};

export type SiItem = {
  title: string;
  meta?: string;
  status?: string;
  source?: string;
  tags?: string[];
  sourceLabel?: string;
  placement?: string;
  draft?: string;
  draftMode?: "publishable" | "guidance" | string;
  confidence?: "high" | "medium" | "low" | string;
  intent?: string;
  basis?: string;
};

export type SiSideItem = {
  name: string;
  score: number;
};

export type SiSite = {
  id: number;
  site_name: string | null;
  site_url: string;
};

export type SiSummary = {
  module: SiModule;
  tab: string;
  site: {
    id: number;
    name: string;
    url: string;
  } | null;
  title: string;
  desc: string;
  metrics: SiMetric[];
  panelTitle: string;
  items: SiItem[];
  actions: string[];
  sideTitle: string;
  sideItems: SiSideItem[];
  recommendation: string;
  meta?: {
    source?: string;
    status?: string;
    analyzed_at?: string | null;
  };
};

export type SiSummaryResponse = {
  ok: boolean;
  data?: SiSummary;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
};

export type SiSitesResponse = {
  ok: boolean;
  data?: SiSite[];
  error?: {
    code: string;
    message: string;
  };
  message?: string;
};
