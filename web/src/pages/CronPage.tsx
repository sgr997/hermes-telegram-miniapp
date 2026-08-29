import { useEffect, useState } from "react";
import { Clock, Pause, Play, Plus, Trash2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { CronJob } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  enabled: "success",
  scheduled: "success",
  paused: "warning",
  error: "destructive",
  completed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  enabled: "已启用",
  scheduled: "已计划",
  paused: "已暂停",
  error: "错误",
  completed: "已完成",
};

const DELIVER_LABEL: Record<string, string> = {
  local: "本地",
  Telegram: "Telegram",
  Discord: "Discord",
  Slack: "Slack",
  email: "邮件",
};

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  // New job form state
  const [prompt, setPrompt] = useState("");
  const [schedule, setSchedule] = useState("");
  const [name, setName] = useState("");
  const [deliver, setDeliver] = useState("local");
  const [creating, setCreating] = useState(false);

  const loadJobs = () => {
    api
      .getCronJobs()
      .then(setJobs)
      .catch(() => showToast("定时任务加载失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleCreate = async () => {
    if (!prompt.trim() || !schedule.trim()) {
      showToast("任务内容和工作计划为必填项", "error");
      return;
    }
    setCreating(true);
    try {
      await api.createCronJob({
        prompt: prompt.trim(),
        schedule: schedule.trim(),
        name: name.trim() || undefined,
        deliver,
      });
      showToast("定时任务已创建", "success");
      setPrompt("");
      setSchedule("");
      setName("");
      setDeliver("local");
      loadJobs();
    } catch (e) {
      showToast(`Failed to create job: ${e}`, "error");
    } finally {
      setCreating(false);
    }
  };

  const handlePauseResume = async (job: CronJob) => {
    try {
      const isPaused = job.state === "paused";
      if (isPaused) {
        await api.resumeCronJob(job.id);
        showToast(`Resumed "${job.name || job.prompt.slice(0, 30)}"`, "success");
      } else {
        await api.pauseCronJob(job.id);
        showToast(`Paused "${job.name || job.prompt.slice(0, 30)}"`, "success");
      }
      loadJobs();
    } catch (e) {
      showToast(`Action failed: ${e}`, "error");
    }
  };

  const handleTrigger = async (job: CronJob) => {
    try {
      await api.triggerCronJob(job.id);
      showToast(`Triggered "${job.name || job.prompt.slice(0, 30)}"`, "success");
      loadJobs();
    } catch (e) {
      showToast(`Trigger failed: ${e}`, "error");
    }
  };

  const handleDelete = async (job: CronJob) => {
    try {
      await api.deleteCronJob(job.id);
      showToast(`Deleted "${job.name || job.prompt.slice(0, 30)}"`, "success");
      loadJobs();
    } catch (e) {
      showToast(`Delete failed: ${e}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Toast toast={toast} />

      {/* Create new job form */}
      <Card className="transition-all duration-150 hover:shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-sans">
            <Plus className="h-4 w-4 text-primary" />
            New Cron Job
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cron-name" className="text-sm font-sans">Name (optional)</Label>
              <Input
                id="cron-name"
                placeholder="例如：每日摘要"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-sans"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cron-prompt" className="text-sm font-sans">Prompt</Label>
              <textarea
                id="cron-prompt"
                className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-sans shadow-sm placeholder:text-muted-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="每次运行智能体需要做什么？"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cron-schedule" className="text-sm font-sans">Schedule (cron expression)</Label>
                <Input
                  id="cron-schedule"
                  placeholder="0 9 * * *"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cron-deliver" className="text-sm font-sans">Deliver to</Label>
                <Select
                  id="cron-deliver"
                  value={deliver}
                  onChange={(e) => setDeliver(e.target.value)}
                >
                  <option value="local">本地</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Discord">Discord</option>
                  <option value="Slack">Slack</option>
                  <option value="邮件">邮件</option>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full transition-all duration-150 hover:-translate-y-0.5"
                >
                  <Plus className="h-3 w-3" />
                  {creating ? "创建中..." : "创建"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 font-sans">
          <Clock className="h-4 w-4" />
          Scheduled Jobs ({jobs.length})
        </h2>

        {jobs.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground font-sans">
              No cron jobs configured. Create one above.
            </CardContent>
          </Card>
        )}

        {jobs.map((job) => (
          <Card
            key={job.id}
            className="transition-all duration-150 hover:shadow-sm hover:border-primary/30"
          >
            <CardContent className="flex items-center gap-4 py-4">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate font-sans">
                    {job.name || job.prompt.slice(0, 60) + (job.prompt.length > 60 ? "..." : "")}
                  </span>
                  <Badge variant={STATUS_VARIANT[job.state] ?? "secondary"}>
                    {STATUS_LABEL[job.state] ?? job.state}
                  </Badge>
                  {job.deliver && job.deliver !== "local" && (
                    <Badge variant="outline">{DELIVER_LABEL[job.deliver] ?? job.deliver}</Badge>
                  )}
                </div>
                {job.name && (
                  <p className="text-xs text-muted-foreground truncate mb-1 font-sans">
                    {job.prompt.slice(0, 100)}{job.prompt.length > 100 ? "..." : ""}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap font-sans">
                  <span className="font-mono text-foreground/80">{job.schedule_display}</span>
                  <span className="whitespace-nowrap">Last: {formatTime(job.last_run_at)}</span>
                  <span className="whitespace-nowrap">Next: {formatTime(job.next_run_at)}</span>
                </div>
                {job.last_error && (
                  <p className="text-xs text-destructive mt-1 truncate font-sans">{job.last_error}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  title={job.state === "paused" ? "恢复" : "暂停"}
                  aria-label={job.state === "paused" ? "恢复任务" : "暂停任务"}
                  onClick={() => handlePauseResume(job)}
                  className="transition-all duration-150 hover:bg-muted"
                >
                  {job.state === "paused" ? (
                    <Play className="h-4 w-4 text-success" />
                  ) : (
                    <Pause className="h-4 w-4 text-warning" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="立即触发"
                  aria-label="立即触发任务"
                  onClick={() => handleTrigger(job)}
                  className="transition-all duration-150 hover:bg-muted"
                >
                  <Zap className="h-4 w-4 text-primary" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="删除"
                  aria-label="删除任务"
                  onClick={() => handleDelete(job)}
                  className="transition-all duration-150 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}