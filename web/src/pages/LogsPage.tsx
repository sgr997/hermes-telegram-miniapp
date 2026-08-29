import { useEffect, useState, useCallback, useRef } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const FILES = ["agent", "errors", "gateway"] as const;
const FILE_LABELS: Record<string, string> = {
  agent: "智能体",
  errors: "错误",
  gateway: "网关",
};
const LEVELS = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR"] as const;
const LEVEL_LABELS: Record<string, string> = {
  ALL: "全部",
  DEBUG: "调试",
  INFO: "信息",
  WARNING: "警告",
  ERROR: "错误",
};
const COMPONENTS = ["all", "gateway", "agent", "tools", "cli", "cron"] as const;
const COMPONENT_LABELS: Record<string, string> = {
  all: "全部",
  gateway: "网关",
  agent: "智能体",
  tools: "工具",
  cli: "命令行",
  cron: "定时任务",
};
const LINE_COUNTS = [50, 100, 200, 500] as const;

function classifyLine(line: string): "error" | "warning" | "info" | "debug" {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("严重") || upper.includes("致命")) return "error";
  if (upper.includes("WARNING") || upper.includes("警告")) return "warning";
  if (upper.includes("DEBUG")) return "debug";
  return "info";
}

const LINE_COLORS: Record<string, string> = {
  error: "text-destructive",
  warning: "text-warning",
  info: "text-foreground",
  debug: "text-muted-foreground/60",
};

function FilterBar<T extends string>({
  label,
  options,
  value,
  onChange,
  labelMap,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium w-20 shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <Button
            key={opt}
            variant={value === opt ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => onChange(opt)}
          >
            {labelMap?.[opt] ?? opt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function LogsPage() {
  const [file, setFile] = useState<(typeof FILES)[number]>("agent");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("ALL");
  const [component, setComponent] = useState<(typeof COMPONENTS)[number]>("all");
  const [lineCount, setLineCount] = useState<(typeof LINE_COUNTS)[number]>(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getLogs({ file, lines: lineCount, level, component })
      .then((resp) => {
        setLines(resp.lines);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [file, lineCount, level, component]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Logs</CardTitle>
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label className="text-xs">Auto-refresh</Label>
                <Badge
                  variant="success"
                  className={`text-[10px] transition-opacity duration-150 ${autoRefresh ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  Live
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} className="text-xs h-7">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-3 mb-4">
            <FilterBar label="文件" options={FILES} value={file} onChange={setFile} labelMap={FILE_LABELS} />
            <FilterBar label="级别" options={LEVELS} value={level} onChange={setLevel} labelMap={LEVEL_LABELS} />
            <FilterBar label="组件" options={COMPONENTS} value={component} onChange={setComponent} labelMap={COMPONENT_LABELS} />
            <FilterBar
              label="行数"
              options={LINE_COUNTS.map(String) as unknown as readonly string[]}
              value={String(lineCount)}
              onChange={(v) => setLineCount(Number(v) as (typeof LINE_COUNTS)[number])}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div
            ref={scrollRef}
            className="border border-border bg-muted/30 p-4 font-mono text-xs leading-5 overflow-auto overflow-x-auto max-h-[600px] min-h-[200px] rounded-lg"
          >
            {lines.length === 0 && !loading && (
              <p className="text-muted-foreground text-center py-8">No log lines found</p>
            )}
            {lines.map((line, i) => {
              const cls = classifyLine(line);
              return (
                <div key={i} className={`${LINE_COLORS[cls]} hover:bg-muted/50 px-1 -mx-1 rounded whitespace-pre-wrap break-all`}>
                  {line}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}