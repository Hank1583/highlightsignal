# Highlight Signal V1.5 功能盤點與 AdFusion 合併分析素材

更新日期：2026-06-08  
用途：提供給 Claude 或其他模型做產品交叉分析、功能合併評估、使用者流程檢查與 V2 規劃。

---

## 1. 專案定位

Highlight Signal 是一個面向品牌、電商、B2B 服務與行銷團隊的 AI 搜尋與成效分析平台。

目前主專案核心是：

- Dashboard 工作台
- GA4 流量分析
- Search Intelligence
- SEO / AEO / GEO 分析
- Dashboard AI 問答與建議
- 產品權限與訂閱入口
- Cloudflare Workers + OpenNext 部署準備

目前 ADS 僅有預留頁與權限架構，完整 AdFusion ADS 功能尚未合併。

---

## 2. 技術棧

| 類別 | 目前狀態 |
|---|---|
| Framework | Next.js 16.2.7 App Router |
| React | React 19.2.7 / React DOM 19.2.7 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Charts | Recharts |
| Animation | Framer Motion |
| Auth | JWT cookie，使用 `jose` |
| Deployment | Cloudflare Workers + OpenNext |
| Cloudflare adapter | `@opennextjs/cloudflare` |
| Legacy adapter | 已移除 `@cloudflare/next-on-pages` |
| Backend | 既有 Highlight PHP API |

---

## 3. V1.5 升版狀態

V1.5 的目的不是加入完整 ADS，而是讓主專案先具備 AdFusion 合併前的環境基礎。

已完成：

- Next.js 從 15 升到 16.2.7
- React / React DOM 升到 19.2.7
- 改用 OpenNext Cloudflare adapter
- 新增 `open-next.config.ts`
- 更新 `wrangler.jsonc` 為 Workers + OpenNext 輸出
- 新增 `public/_headers`
- `.gitignore` 忽略 `.open-next/` 與 `.wrangler/`
- `/ads` 已納入 product permission map
- ESLint config 更新為 Next 16 相容格式

已驗證：

- `npx tsc --noEmit --pretty false` 通過
- `npm run lint` 通過
- `npm run build` 通過
- `npm run build:cf` 通過，成功產生 `.open-next/worker.js`

注意：

- 目前仍保留 `middleware.ts`，未改成 Next 16 建議的 `proxy.ts`。
- 原因：OpenNext Cloudflare build 對 `proxy.ts` 會出現 Node.js middleware 不支援問題；保留 Edge Middleware 可讓 Cloudflare build 通過。
- Next build 會出現 middleware deprecated warning，但不阻擋建置。

---

## 4. 環境變數

目前 `.env.example` 中列出的必要環境：

| 變數 | 用途 |
|---|---|
| `JWT_SECRET` | JWT 簽章密鑰，production 必填 |
| `NEXT_PUBLIC_BASE_URL` | 前端公開網址 |
| `NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL` | Highlight PHP API base URL |
| `NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL` | 升級或購買方案入口 |
| `API_DOMAIN` | Legacy auth API domain |

AdFusion 合併後預期還需要：

| 變數 | 用途 |
|---|---|
| `API_HOST` | AdFusion Java Spring Boot backend |
| `NEXT_PUBLIC_USE_MOCK` | ADS mock mode 開關 |

---

## 5. Auth / Session / 權限

目前主專案 auth 架構：

- 使用 `token` cookie
- JWT 驗證使用 `jose`
- `middleware.ts` 保護登入後頁面
- anonymous user 會被導到 `/auth/login`
- admin 路由需要 `role === "admin"`
- product access 由 `enabledProducts` 控制

目前產品 key：

| Product Key | 說明 |
|---|---|
| `dashboard` | 預設一定啟用 |
| `ga` | GA Analytics |
| `si` | Search Intelligence / SEO |
| `ads` | ADS / AdFusion 預留 |

目前受保護路由：

- `/dashboard`
- `/ga`
- `/si`
- `/seo`
- `/ads`
- `/account`
- `/team`
- `/admin`

目前產品權限對應：

| 路由 | 需要產品 |
|---|---|
| `/ga` | `ga` |
| `/si` | `si` |
| `/seo` | `si` |
| `/ads` | `ads` |

AdFusion 合併時需要確認：

- AdFusion 是否也使用 `token` cookie
- JWT payload 欄位是否一致
- `member_id` / `id` / `email` / `role` / `enabledProducts` 是否能共用
- 登出是否能同時清除主專案與 ADS 狀態
- demo user 是否可進 ADS

---

## 6. 公開頁與基礎頁

| 頁面 | 路徑 | 狀態 | 說明 |
|---|---|---:|---|
| Landing Page | `/` | 已有 | 產品介紹、核心產品、workflow、FAQ、contact、about |
| Login | `/auth/login` | 已有 | 登入頁 |
| Register | `/auth/register` | 已有 | 註冊頁 |
| Enter | `/enter` | 已有 | 入口導流 route |
| Privacy | `/privacy` | 已有 | 隱私權頁 |
| Terms | `/terms` | 已有 | 服務條款 |
| Sitemap | `/sitemap.xml` | 已有 | Next sitemap |
| Robots | `/robots.txt` | 已有 | Next robots |

Landing Page 目前傳達的產品線：

- GA4 流量分析
- Search Intelligence
- 廣告成效判讀，尚未完整實作

---

## 7. App Shell / 共用介面

| 元件 | 說明 |
|---|---|
| `AppHeader` | 登入後上方導覽，含 logo、產品切換、UserMenu |
| `ProductSelect` | 依 `enabledProducts` 顯示 Dashboard / GA / SI / ADS |
| `UserMenu` | 使用者選單 |
| `Navbar` | 公開或共用導覽 |
| `Footer` | footer |
| `ga-pageview` | GA pageview tracking component |
| `ClientLayoutWrapper` | client layout wrapper |

主要產品切換：

- Dashboard
- GA 數據分析
- Search Intelligence
- ADS 廣告成效

---

## 8. Dashboard 功能

| 頁面 | 路徑 | 狀態 | 說明 |
|---|---|---:|---|
| Dashboard | `/dashboard` | 已有 | GA + SEO 摘要、AI 分析工作台 |
| Dashboard Settings | `/dashboard/settings` | 已有 | Dashboard 設定 |
| Dashboard Support | `/dashboard/support` | 已有 | 支援入口 |

Dashboard 目前整合：

- GA overview
- SEO overview
- 30 天資料區間
- 流量趨勢
- 使用者數、sessions、pageviews、conversions
- SEO score
- SEO issues
- SEO opportunities
- connected / enabled 狀態
- Onboarding checklist
- AI 問答面板

Dashboard AI 功能：

- 預設問題 prompt
- 依問題推斷 lens：
  - overview
  - traffic
  - priority
  - seo
  - visibility
- 支援 AI block renderer：
  - narrative
  - metricHero
  - metrics
  - chart
  - trendChart
  - action
  - issues
  - scoreBreakdown

Dashboard API：

| API | 說明 |
|---|---|
| `/api/dashboard/ai-compose` | Dashboard AI compose proxy |

Dashboard AI quota：

| 身分 | 每日額度 |
|---|---:|
| Free / unknown | 3 |
| Basic / member | 20 |
| Pro | 100 |
| Admin | 500 |

---

## 9. GA Analytics 功能

| 頁面 | 路徑 | 狀態 | 說明 |
|---|---|---:|---|
| GA Overview | `/ga` | 已有 | GA 總覽、KPI、主要流量概況 |
| Trend | `/ga/trend` | 已有 | 趨勢分析 |
| AI Insights | `/ga/insights` | 已有 | GA AI 洞察 |
| Traffic | `/ga/traffic` | 已有 | 流量來源分析 |
| Pages | `/ga/pages` | 已有 | 頁面成效分析 |
| Conversions | `/ga/conversions` | 已有 | 轉換分析 |
| Funnel | `/ga/funnel` | 已有 | 轉換漏斗 |
| Report | `/ga/report` | 已有 | 報表管理 |
| Report Create | `/ga/report/create` | 已有 | 建立報表 |
| Report Edit | `/ga/report/[id]/edit` | 已有 | 編輯報表 |
| Account | `/ga/account` | 已有 | GA 帳號 / connection 設定 |

GA 共用元件：

| 元件 | 說明 |
|---|---|
| `DashboardShell` | GA 頁面框架 |
| `Sidebar` | GA 側邊導覽 |
| `PageHeader` | 頁面標題區 |
| `KpiCard` | KPI 卡片 |
| `GrowthCard` | 成長指標卡 |
| `TrendChartCard` | 趨勢圖 |
| `TrafficChartCard` | 流量圖 |
| `PagesCompareTable` | 頁面比較表 |
| `EventsConversionsCard` | 事件與轉換卡 |
| `GaAccountSelector` | GA connection 選擇 |
| `EmptyGAState` | 空狀態 |
| `AiCommandPanel` | GA AI 操作面板 |

GA API：

| API | 說明 |
|---|---|
| `/api/ga/connections` | GA connections |
| `/api/ga/query` | GA query proxy |
| `/api/ga/ai-query` | GA AI query |
| `/api/ga/report/list` | 報表列表 |
| `/api/ga/report/detail` | 報表詳細 |
| `/api/ga/report/save` | 儲存報表 |
| `/api/ga/report/update` | 更新報表 |

GA 資料來源：

- PHP API
- frontend 透過 Next API routes proxy
- `lib/ga/gaApi.ts`
- `app/(app)/ga/dataSource.ts`

---

## 10. Search Intelligence / SEO / AEO / GEO 功能

| 頁面 | 路徑 | 狀態 | 說明 |
|---|---|---:|---|
| SI Home | `/si` | 已有 | Search Intelligence 入口 |
| SEO | `/si/seo` | 已有 | SEO 總覽、keywords、technical tabs |
| AEO | `/si/aeo` | MVP | Answer Engine Optimization |
| GEO | `/si/geo` | MVP | Generative Engine Optimization |
| Legacy SEO Route | `/seo` | 已有 | SEO layout / route alias |

Search Intelligence 導覽分組：

| 分組 | 功能 |
|---|---|
| SEO | SEO 總覽、關鍵字、Technical SEO |
| AEO | AEO 總覽、FAQ、snippet / short answer |
| GEO | GEO 總覽、AI citation、AI visibility |

SEO 功能：

- site list
- add site dialog
- SEO summary
- health score
- technical issues
- top opportunities
- PageSpeed cache / query
- tabs for keywords / technical

AEO / GEO 功能：

- summary query
- generate endpoint
- insight page rendering
- site selector
- overview / detail style tabs

SEO / SI API：

| API | 說明 |
|---|---|
| `/api/seo/sites` | SEO sites |
| `/api/seo/summary` | SEO summary |
| `/api/seo/pagespeed` | PageSpeed proxy |
| `/api/si/sites` | SI sites |
| `/api/si/aeo/summary` | AEO summary |
| `/api/si/aeo/generate` | AEO generate |
| `/api/si/geo/summary` | GEO summary |
| `/api/si/geo/generate` | GEO generate |

---

## 11. ADS / AdFusion 目前狀態

主專案目前 ADS 狀態：

| 項目 | 狀態 | 說明 |
|---|---:|---|
| `/ads` route | 已有 | Coming Soon / Beta 頁 |
| `ads` product key | 已有 | `lib/products.ts` 已支援 |
| ProductSelect ADS 選項 | 已有 | 依 `enabledProducts` 顯示 |
| middleware ADS 權限 | 已補 | `/ads` 需要 `ads` access |
| 完整 ADS pages | 未合併 | 等 AdFusion 合併 |
| ADS API proxy | 未合併 | 等 AdFusion `api/adfusion/[...path]` |
| ADS components | 未合併 | 等 `components/ads/` |
| ADS backend | 未合併 | AdFusion Java Spring Boot |

現有 `/ads` 頁面功能：

- 顯示 ADS Intelligence 即將推出
- 說明目前 V1 聚焦 GA / Search Intelligence / AEO / GEO / Dashboard AI
- 提供回 Dashboard 與聯絡我們按鈕

---

## 12. AdFusion 待合併規格

以下為預期要合併的 AdFusion 功能線。

### AdFusion 技術棧

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts
- Framer Motion
- Lucide React
- JWT Auth
- Java Spring Boot backend
- Next.js proxy to Java backend

### AdFusion 支援平台

- Google Ads
- Facebook Ads
- LINE Ads

### AdFusion 頁面

| 頁面 | 路徑 | 狀態 | 說明 |
|---|---|---:|---|
| ADS Dashboard | `/ads` | 完成 | KPI 總覽、平台分析、趨勢圖 |
| 廣告成效分析 | `/ads/analysis` | 完成 | 跨平台成效、點擊 / 轉換 / ROAS 圖表 |
| 受眾洞察 | `/ads/audience` | 完成 | 受眾分析 |
| 預算規劃 | `/ads/budget` | 完成 | 預算分配與規劃 |
| AI 素材生成 | `/ads/creative` | 完成 | AI 生成廣告素材 |
| 廣告文案庫 | `/ads/copies` | 完成 | 文案管理與瀏覽 |
| 白皮書 | `/ads/whitepaper` | 完成 | 白皮書下載 / 檢視 |
| 廣告活動管理 | `/ads/campaigns` | 完成 | Campaign 列表與管理 |
| A/B 測試 | `/ads/ab-test` | 完成 | 廣告 A/B 測試管理 |
| 報表管理 | `/ads/reports` | 完成 | 報表產生與下載 |
| 通知中心 | `/ads/notifications` | 完成 | 系統通知 |
| 設定 | `/ads/settings` | 完成 | 使用者設定 |
| 留言情緒 | `/ads/sentiment` | 後端串接中 | ComingSoon 佔位 |
| 品牌策略 | `/ads/brand` | 後端串接中 | ComingSoon 佔位 |

### AdFusion 共用元件

| 元件 | 說明 |
|---|---|
| `KpiCard` | KPI 指標卡片 |
| `Badge` | 標籤徽章 |
| `LoadingSpinner` | 載入動畫 |
| `Sidebar` | 側邊導覽列 |
| `ComingSoon` | 未完成頁面佔位 |
| `SessionInit` | Session 初始化 |
| `LineSyncBanner` | LINE 帳號同步提示 |
| `charts/ClickConversionChart` | 點擊與轉換趨勢圖 |
| `charts/RoasChart` | ROAS 趨勢圖 |
| `charts/PlatformBreakdownChart` | 平台佔比圖 |
| `charts/SpendTrendChart` | 消費趨勢圖 |

### AdFusion 基礎設施

| 模組 | 說明 |
|---|---|
| `lib/ads/AdsApi.ts` | API client，語意路徑到 backend path |
| `lib/ads/AdsCache.ts` | sessionStorage cache，TTL 5 分鐘 |
| `lib/ads/serverSession.ts` | Server-side JWT session |
| `lib/ads/mockData.ts` | mock mode data |
| `lib/ads/ads-nav.ts` | ADS sidebar nav |
| `lib/ads/useLineSync.ts` | LINE sync hook |
| `app/api/adfusion/[...path]` | catch-all proxy to Java backend |
| `api/auth/login` | 登入 API，需與主專案合併 |
| `api/auth/me` | 目前使用者，需與主專案合併 |
| `middleware.ts` | JWT 路由保護，需與主專案合併 |

---

## 13. 後端與資料來源

目前主專案後端：

- PHP backend 是資料 source of truth
- PHP 專案位置：`D:\7.Highlight\1.Project\4.php\highlightsignal`
- frontend 不保存 backend duplicate
- Next API routes 作為 proxy / adapter

目前 PHP API 分區：

- `ga/*`
- `si/*`
- `dashboard/ai_plan.php`
- `dashboard/ai_compose.php`
- `dashboard/ai_usage.php`
- `sql/si/*`
- `sql/dashboard/dashboard_ai_logs.sql`

AdFusion 合併後會新增：

- Java Spring Boot backend
- `api/adfusion/[...path]` catch-all proxy
- Google Ads / Facebook Ads / LINE Ads data
- ADS mock mode

需要分析的重點：

- PHP API 與 Java API 是否共用 auth header
- 是否統一 member id
- 是否統一 error response shape
- 是否統一 quota / subscription policy
- Dashboard AI 是否要同時讀 PHP + Java data

---

## 14. 目前缺口 / 風險

### 產品與 UX

- GA / SI / ADS 未來會有三套側邊導覽，需統一體驗。
- AdFusion 合併後 `/ads` 會從 Coming Soon 變成完整 Dashboard，需要處理主專案現有 route 覆蓋。
- 主 Dashboard 尚未整合 ADS KPI。
- ProductSelect 與 ADS Sidebar 的層級關係要定義清楚。

### Auth

- 主專案與 AdFusion 都使用 JWT cookie，但 payload 欄位可能不同。
- 若 AdFusion 有獨立 login/me，需要合併或明確共存。
- `token` cookie domain / path / secure / sameSite 需要 production 驗證。

### Cloudflare

- 已改用 OpenNext Cloudflare adapter。
- `middleware.ts` 保留可通過 Cloudflare build，但 Next 16 會提示未來要改 `proxy.ts`。
- 若 OpenNext 未來支援 Node proxy，再評估遷移。
- Windows 本機 OpenNext 會提示建議使用 WSL；Cloudflare Linux build 應更接近正式環境。

### 技術債

- ESLint 中關閉了 `react-hooks/set-state-in-effect` 與 `react-hooks/immutability`，原因是既有頁面大量使用 useEffect 同步 setState。這不是 V1.5 阻擋點，但未來可以逐步修。
- README 仍可補 OpenNext / V1.5 部署說明。
- `wrangler.jsonc` compatibility date 可再更新到更近期日期。

---

## 15. 建議請 Claude 交叉分析的問題

可以把以下問題一起丟給 Claude：

1. 以實際使用者流程來看，Dashboard / GA / SI / ADS 四條產品線是否容易理解？
2. AdFusion 合併進來後，首頁與 Dashboard 應該如何重新排序產品重點？
3. ProductSelect + ADS Sidebar 是否會造成導覽層級混亂？
4. 主 Dashboard 應該顯示哪些 ADS KPI，才能和 GA / SEO 產生交叉價值？
5. GA conversion 與 ADS campaign performance 應如何整合，才能形成可行動建議？
6. SEO / AEO / GEO 與 ADS Creative / Copies 是否能形成內容生成閉環？
7. Auth / session / token payload 合併的最佳策略是什麼？
8. PHP backend + Java backend 共存時，API proxy 與 error handling 應如何標準化？
9. V2 最小可上線版本應該包含哪些 ADS 頁面？哪些可以延後？
10. 若目標是商業化，方案權限應如何切分 GA / SI / ADS / AI 額度？

---

## 16. 建議 V2 MVP 範圍

若目標是快速推出 V2，建議不要一次追求完整廣告管理平台，而是先推出 ADS Intelligence MVP：

必備：

- `/ads` ADS Dashboard
- `/ads/analysis`
- `/ads/campaigns`
- `/ads/budget`
- `/ads/reports`
- ADS API proxy
- ADS mock mode
- ADS 權限整合
- 主 Dashboard ADS summary

可延後：

- `/ads/sentiment`
- `/ads/brand`
- 完整素材生成流程
- 完整 A/B 測試自動化
- 深度通知中心

最重要的交叉價值：

- GA conversion + ADS spend + SEO visibility
- Campaign ROAS + Landing page performance
- Creative / copy suggestions + SEO / AEO content gap
- Budget planning + Dashboard AI action recommendation

