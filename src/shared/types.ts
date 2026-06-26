/**
 * CommentGrab shared domain model. Every layer (background, content, popup,
 * dashboard) speaks in these types so exports, storage, and the UI stay in sync.
 */

export type PlatformId =
  | 'reddit'
  | 'redditProfile'
  | 'youtube'
  | 'hackernews'
  | 'steam'
  | 'bluesky'
  | 'github'
  | 'stackexchange'
  | 'instagram'
  | 'googlemaps'
  | 'generic';

/** A single scraped comment / review / reply. */
export interface Comment {
  /** The comment body, whitespace-normalized. */
  text: string;
  /** Author handle without the leading u/ or @. */
  author: string;
  /** ISO-8601 timestamp when available, otherwise the platform's display string. */
  timestamp: string;
  /** Direct link to the comment when one exists. */
  permalink: string;
  /** URLs found inside the comment body. */
  links: string[];
  /** Up-votes / likes. `'Hidden'` when the platform does not expose a count. */
  score: number | 'Hidden';
  /** Thread depth: 0 = top level, 1 = reply, etc. */
  depth: number;
  /** Stable platform id used for de-duplication. */
  commentId: string;
  /** Number of direct replies, when known. */
  replyCount?: number;
  /** Profile-scrape extras. */
  subreddit?: string;
  type?: 'comment' | 'post' | 'review';
  title?: string;
}

/** Metadata about the post / video / product the comments belong to. */
export interface Post {
  title: string;
  body: string;
  url: string;
  /** Friendly origin label, e.g. "r/startups", a channel, or a domain. */
  source: string;
  author?: string;
  score?: number;
  numComments?: number;
}

export type ScrapeMethod = 'json' | 'dom' | 'api';

export interface ScrapeResult {
  success: boolean;
  comments: Comment[];
  post: Post | null;
  platform: PlatformId;
  method?: ScrapeMethod;
  error?: string;
  rateLimited?: boolean;
}

export interface ScrapeProgress {
  message: string;
  percent: number;
}

export interface ScrapeOptions {
  /** Soft cap on comments for DOM scrapers that auto-scroll. */
  maxComments?: number;
  /** Expand reply threads on platforms that hide them (YouTube). */
  expandReplies?: boolean;
}

/* ----------------------------- Exports ----------------------------- */

export type ExportFormat = 'csv' | 'json' | 'markdown' | 'clipboard';

export interface ExportSettings {
  /** Prepend post title/body/url/source block. */
  includePostInfo: boolean;
  /** Author + timestamp columns/fields. */
  includeMetadata: boolean;
  includeScores: boolean;
  includePermalinks: boolean;
  includeLinks: boolean;
  /** Keep thread depth (indentation / depth column). */
  preserveThreads: boolean;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  includePostInfo: true,
  includeMetadata: true,
  includeScores: true,
  includePermalinks: true,
  includeLinks: true,
  preserveThreads: true,
};

/* ----------------------------- Storage ----------------------------- */

/** A user-created research workspace. A collection can belong to several. */
export interface Board {
  id: string;
  name: string;
  createdAt: number;
}

export interface SavedCollection {
  id: string;
  title: string;
  platform: PlatformId;
  source: string;
  url: string;
  post: Post | null;
  comments: Comment[];
  commentCount: number;
  createdAt: number;
  updatedAt: number;
  note?: string;
  pinned?: boolean;
  analysis?: AnalysisResult | null;
  /** Boards this collection is filed under. */
  boardIds?: string[];
}

export interface HistoryEntry {
  id: string;
  platform: PlatformId;
  title: string;
  source: string;
  url: string;
  commentCount: number;
  scrapedAt: number;
  /** Set when the scrape was saved into a collection. */
  savedCollectionId?: string;
}

export interface MonthlyBucket {
  scrapes: number;
  comments: number;
  /** Exports run that month (added later; may be absent on older buckets). */
  exports?: number;
}

export interface Stats {
  totalScrapes: number;
  totalComments: number;
  totalExports: number;
  /** platform id -> comments scraped. */
  commentsByPlatform: Record<string, number>;
  /** platform id -> scrape count. */
  scrapesByPlatform: Record<string, number>;
  /** export format -> count. */
  exportsByFormat: Record<string, number>;
  /** "YYYY-MM" -> bucket. */
  monthly: Record<string, MonthlyBucket>;
  firstUseAt: number;
  lastActivity: number;
}

export const EMPTY_STATS: Stats = {
  totalScrapes: 0,
  totalComments: 0,
  totalExports: 0,
  commentsByPlatform: {},
  scrapesByPlatform: {},
  exportsByFormat: {},
  monthly: {},
  firstUseAt: 0,
  lastActivity: 0,
};

export type WidgetPosition = 'bottom-left' | 'bottom-right';

export interface AppSettings {
  openAiKey: string;
  openAiModel: string;
  export: ExportSettings;
  widgetEnabled: boolean;
  widgetPosition: WidgetPosition;
  /** Auto-save every successful scrape into a collection. */
  autoSave: boolean;
  /** Optional extra guidance injected into the AI analysis prompt. */
  analysisInstructions: string;
  /** UI language code (en, es, pt, fr, de). */
  language: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openAiKey: '',
  openAiModel: 'gpt-4o-mini',
  export: DEFAULT_EXPORT_SETTINGS,
  widgetEnabled: true,
  widgetPosition: 'bottom-left',
  autoSave: false,
  analysisInstructions: '',
  language: 'en',
};

/* ----------------------------- Analysis ---------------------------- */

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  label: string;
}

export interface ThemeCount {
  theme: string;
  mentions: number;
}

/** A distinct marketing angle generated on demand from the analysis. */
export interface AdAngle {
  angle: string;
  description: string;
}

export interface AnalysisResult {
  model: string;
  createdAt: number;
  commentsAnalyzed: number;
  /** OpenAI token usage for this analysis (optional on older saved analyses). */
  tokensIn?: number;
  tokensOut?: number;
  summary: string;
  hooks: string[];
  objections: string[];
  emotionalTriggers: string[];
  failedSolutions: string[];
  customerLanguage: string[];
  topThemes: ThemeCount[];
  sentiment: SentimentBreakdown;
  /** Ad angles, generated separately on demand (not part of the base analysis). */
  adAngles?: AdAngle[];
}
