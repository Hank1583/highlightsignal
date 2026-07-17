export type SeoSite = {
  id: number;
  site_name: string | null;
  site_url: string;
};

export type SeoListResponse = {
  ok: boolean;
  data: SeoSite[];
  error?: {
    code?: string;
    message?: string;
  };
};

export type SeoAddPayload = {
  user_id: number;
  site_url: string;
  site_name?: string | null;
};

export type SeoAddResponse = {
  ok: boolean;
  data?: {
    id: number;
    site_name: string | null;
    site_url: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export type SeoSummaryKeyword = {
  keyword: string;
  position: number | null;
  ctr: number;
  clicks: number;
  impressions: number;
  action: "PUSH" | "DEFEND" | "WATCH";
};

export type SeoSummaryResponse = {
  ok: boolean;
  data: {
    site_id: number;
    site_name: string | null;
    site: string;
    health: {
      score: number;
      breakdown: {
        tech: number;
        content: number | null;
      };
    };
    keywords: SeoSummaryKeyword[];
    pushKeywords: SeoSummaryKeyword[];
    defendKeywords: SeoSummaryKeyword[];
    watchKeywords: SeoSummaryKeyword[];
    topOpportunities: Array<{
      keyword: string;
      position: number | null;
      clicks: number;
      impressions: number;
      ctr: number;
      action: "PUSH";
      recommendation?: string;
      recommendations?: string[];
    }>;
    technicalIssues: Array<{
      severity: "HIGH" | "MEDIUM" | "LOW";
      type: string;
      url: string;
      message: string;
      recommendation?: string;
    }>;
    suggestions: Array<{
      title: string;
      reason: string;
      rule: string;
      priority?: "HIGH" | "MEDIUM" | "LOW";
    }>;
    meta: {
      source: string;
      updated_at: string;
      http_code: number;
      final_url: string;
      content_type: string;
      gsc: {
        ok: boolean;
        message: string;
      };
    };
    comparison?: {
      available: boolean;
      previous_scanned_at: string | null;
      current_scanned_at: string;
      health_score: { before: number; after: number; change: number };
      issues: {
        before: number;
        after: number;
        fixed: number;
        added: number;
        remaining: number;
        fixed_items: Array<{ severity: "HIGH" | "MEDIUM" | "LOW"; type: string; url: string; message: string }>;
        added_items: Array<{ severity: "HIGH" | "MEDIUM" | "LOW"; type: string; url: string; message: string }>;
        remaining_items: Array<{ severity: "HIGH" | "MEDIUM" | "LOW"; type: string; url: string; message: string }>;
      };
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};
