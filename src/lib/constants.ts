export const APP_NAME = "ACM Contest Review Portal";
export const APP_DESCRIPTION = "Internal review portal for ACM contest submissions";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export const HACKERRANK_BASE_URL = "https://www.hackerrank.com";

export const SUBMISSION_STATUSES = [
  "Accepted",
  "Wrong Answer",
  "Time Limit Exceeded",
  "Runtime Error",
  "Compilation Error",
  "Memory Limit Exceeded",
  "Segmentation Fault",
  "Terminated due to timeout",
  "Abort Called",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const STATUS_FILTERS = [
  { label: "Accepted", value: "Accepted" },
  { label: "Wrong Answer", value: "Wrong Answer" },
  { label: "TLE", value: "Time Limit Exceeded" },
  { label: "Runtime Error", value: "Runtime Error" },
  { label: "Compilation Error", value: "Compilation Error" },
  { label: "MLE", value: "Memory Limit Exceeded" },
] as const;

export const REVIEW_FILTERS = [
  { label: "Reviewed", value: "reviewed" },
  { label: "Not Reviewed", value: "not_reviewed" },
  { label: "Flagged", value: "flagged" },
] as const;

export const LANGUAGES = [
  "c", "cpp", "cpp14", "cpp17", "cpp20",
  "java", "java8", "java15",
  "python", "python3", "pypy", "pypy3",
  "javascript", "typescript",
  "csharp", "go", "rust", "kotlin", "swift", "scala",
  "ruby", "php", "perl", "haskell", "clojure", "erlang",
] as const;

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  c: "C",
  cpp: "C++",
  cpp14: "C++14",
  cpp17: "C++17",
  cpp20: "C++20",
  java: "Java",
  java8: "Java 8",
  java15: "Java 15",
  python: "Python 2",
  python3: "Python 3",
  pypy: "PyPy",
  pypy3: "PyPy 3",
  javascript: "JavaScript",
  typescript: "TypeScript",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  swift: "Swift",
  scala: "Scala",
  ruby: "Ruby",
  php: "PHP",
  perl: "Perl",
  haskell: "Haskell",
  clojure: "Clojure",
  erlang: "Erlang",
};

export const MONACO_LANGUAGE_MAP: Record<string, string> = {
  c: "c",
  cpp: "cpp",
  cpp14: "cpp",
  cpp17: "cpp",
  cpp20: "cpp",
  java: "java",
  java8: "java",
  java15: "java",
  python: "python",
  python3: "python",
  pypy: "python",
  pypy3: "python",
  javascript: "javascript",
  typescript: "typescript",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  kotlin: "kotlin",
  swift: "swift",
  scala: "scala",
  ruby: "ruby",
  php: "php",
  perl: "perl",
  haskell: "haskell",
  clojure: "clojure",
  erlang: "erlang",
};

export const SYNC_PHASES = {
  fetching_contest: "Fetching Contest Info...",
  fetching_problems: "Fetching Problems...",
  downloading_submissions: "Downloading Submissions...",
  downloading_source_code: "Downloading Source Code...",
  saving_to_database: "Saving to Database...",
  complete: "Sync Complete",
  error: "Sync Failed",
} as const;

export const KEYBOARD_SHORTCUTS = {
  NEXT: "n",
  PREVIOUS: "p",
  REVIEWED: "r",
  FLAG: "f",
  COPY_CODE: "c",
  SEARCH: "/",
  HELP: "?",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/participants", label: "Participants", icon: "Users" },
  { href: "/problems", label: "Problems", icon: "Code2" },
  { href: "/review", label: "Review", icon: "CheckSquare" },
  { href: "/replay", label: "Replay", icon: "Play" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/search", label: "Search", icon: "Search" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
