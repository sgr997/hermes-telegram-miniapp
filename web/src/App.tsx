import { useState, useEffect, useRef } from "react";
import { Activity, BarChart3, Bot, Clock, FileText, KeyRound, Menu, MessageSquare, Package, Settings, Terminal, X } from "lucide-react";
import StatusPage from "@/pages/StatusPage";
import ChatPage from "@/pages/ChatPage";
import AgentsPage from "@/pages/AgentsPage";
import ConfigPage from "@/pages/ConfigPage";
import EnvPage from "@/pages/EnvPage";
import SessionsPage from "@/pages/SessionsPage";
import LogsPage from "@/pages/LogsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import CronPage from "@/pages/CronPage";
import SkillsPage from "@/pages/SkillsPage";

const NAV_ITEMS = [
  { id: "chat", label: "对话", icon: Terminal },
  { id: "status", label: "状态", icon: Activity },
  { id: "agents", label: "智能体", icon: Bot },
  { id: "sessions", label: "会话", icon: MessageSquare },
  { id: "analytics", label: "分析", icon: BarChart3 },
  { id: "logs", label: "日志", icon: FileText },
  { id: "cron", label: "定时任务", icon: Clock },
  { id: "skills", label: "技能", icon: Package },
  { id: "config", label: "配置", icon: Settings },
  { id: "env", label: "密钥", icon: KeyRound },
] as const;

type PageId = (typeof NAV_ITEMS)[number]["id"];

const PAGE_COMPONENTS: Record<PageId, React.FC> = {
  chat: ChatPage,
  status: StatusPage,
  agents: AgentsPage,
  sessions: SessionsPage,
  analytics: AnalyticsPage,
  logs: LogsPage,
  cron: CronPage,
  skills: SkillsPage,
  config: ConfigPage,
  env: EnvPage,
};

// Pages that need full height (chat)
const FULL_HEIGHT_PAGES = new Set(["chat"]);

export default function App() {
  const [page, setPage] = useState<PageId>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const initialRef = useRef(true);

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    setAnimKey((k) => k + 1);
  }, [page]);

  const PageComponent = PAGE_COMPONENTS[page];
  const isFullHeight = FULL_HEIGHT_PAGES.has(page);

  const handleNav = (id: PageId) => {
    setPage(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-col h-[var(--tg-viewport-height)] overflow-hidden bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            {/* Hamburger (mobile only) */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mr-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:hidden"
              aria-label="打开菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-base font-semibold tracking-tight text-foreground md:text-lg">
              Hermes Agent
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs uppercase tracking-wider text-muted-foreground sm:inline">
              Web UI
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — drawer on mobile, static on desktop */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:translate-x-0 md:shrink-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
            <span className="text-sm font-semibold text-foreground">Menu</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="关闭菜单"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(id)}
                className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  page === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {page === id && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main
          key={animKey}
          className={`flex-1 min-h-0 w-full max-w-full ${isFullHeight ? "flex flex-col overflow-hidden" : "overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6"}`}
          style={isFullHeight ? undefined : { animation: "fade-in 150ms ease-out" }}
        >
          <PageComponent />
        </main>
      </div>

      <footer className="border-t border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <span className="text-xs text-muted-foreground">
            Hermes Agent
          </span>
          <span className="text-xs text-muted-foreground/70">
            Nous Research
          </span>
        </div>
      </footer>
    </div>
  );
}
