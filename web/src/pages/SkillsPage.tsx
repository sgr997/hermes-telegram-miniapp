import { useEffect, useState, useMemo } from "react";
import {
  Package,
  Search,
  Wrench,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { SkillInfo, ToolsetInfo } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

interface CategoryGroup {
  name: string;        // display name
  key: string;         // raw key (or "__none__")
  skills: SkillInfo[];
  enabledCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  mlops: "MLOps",
  "mlops/cloud": "MLOps / 云",
  "mlops/evaluation": "MLOps / 评估",
  "mlops/inference": "MLOps / 推理",
  "mlops/models": "MLOps / 模型",
  "mlops/training": "MLOps / 训练",
  "mlops/vector-databases": "MLOps / 向量数据库",
  mcp: "MCP",
  "red-teaming": "红队测试",
  ocr: "OCR",
  p5js: "p5.js",
  ai: "AI",
  ux: "UX",
  ui: "UI",
};

function prettyCategory(raw: string | null | undefined): string {
  if (!raw) return "通用";
  if (CATEGORY_LABELS[raw]) return CATEGORY_LABELS[raw];
  return raw
    .split(/[-_/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}



/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [toolsets, setToolsets] = useState<ToolsetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [togglingSkills, setTogglingSkills] = useState<Set<string>>(new Set());
  // Start collapsed by default
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | "all">("all");
  const { toast, showToast } = useToast();

  useEffect(() => {
    Promise.all([api.getSkills(), api.getToolsets()])
      .then(([s, t]) => {
        setSkills(s);
        setToolsets(t);
      })
      .catch(() => showToast("技能/工具集加载失败", "error"))
      .finally(() => setLoading(false));
  }, []);

  /* ---- Toggle skill ---- */
  const handleToggleSkill = async (skill: SkillInfo) => {
    setTogglingSkills((prev) => new Set(prev).add(skill.name));
    try {
      await api.toggleSkill(skill.name, !skill.enabled);
      setSkills((prev) =>
        prev.map((s) =>
          s.name === skill.name ? { ...s, enabled: !s.enabled } : s
        )
      );
      showToast(
        `${skill.name} ${skill.enabled ? "disabled" : "已启用"}`,
        "success"
      );
    } catch {
      showToast(`Failed to toggle ${skill.name}`, "error");
    } finally {
      setTogglingSkills((prev) => {
        const next = new Set(prev);
        next.delete(skill.name);
        return next;
      });
    }
  };

  /* ---- Derived data ---- */
  const lowerSearch = search.toLowerCase();

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(lowerSearch) ||
        s.description.toLowerCase().includes(lowerSearch) ||
        (s.category ?? "").toLowerCase().includes(lowerSearch);
      const matchesCategory =
        !activeCategory ||
        (activeCategory === "__none__" ? !s.category : s.category === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [skills, search, lowerSearch, activeCategory]);

  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const map = new Map<string, SkillInfo[]>();
    for (const s of filteredSkills) {
      const key = s.category || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort: General first, then alphabetical
    const entries = [...map.entries()].sort((a, b) => {
      if (a[0] === "__none__") return -1;
      if (b[0] === "__none__") return 1;
      return a[0].localeCompare(b[0]);
    });
    return entries.map(([key, list]) => ({
      key,
      name: prettyCategory(key === "__none__" ? null : key),
      skills: list.sort((a, b) => a.name.localeCompare(b.name)),
      enabledCount: list.filter((s) => s.enabled).length,
    }));
  }, [filteredSkills]);

  const allCategories = useMemo(() => {
    const cats = new Map<string, number>();
    for (const s of skills) {
      const key = s.category || "__none__";
      cats.set(key, (cats.get(key) || 0) + 1);
    }
    return [...cats.entries()]
      .sort((a, b) => {
        if (a[0] === "__none__") return -1;
        if (b[0] === "__none__") return 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([key, count]) => ({ key, name: prettyCategory(key === "__none__" ? null : key), count }));
  }, [skills]);

  const enabledCount = skills.filter((s) => s.enabled).length;

  const filteredToolsets = useMemo(() => {
    return toolsets.filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(lowerSearch) ||
        t.label.toLowerCase().includes(lowerSearch) ||
        t.description.toLowerCase().includes(lowerSearch)
    );
  }, [toolsets, search, lowerSearch]);

  const isCollapsed = (key: string): boolean => {
    if (collapsedCategories === "all") return true;
    return collapsedCategories.has(key);
  };

  const toggleCollapse = (key: string) => {
    setCollapsedCategories((prev) => {
      if (prev === "all") {
        // Switching from "全部已折叠" → expand just this one
        const allKeys = new Set(categoryGroups.map((g) => g.key));
        allKeys.delete(key);
        return allKeys;
      }
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      <Toast toast={toast} />

      {/* ═══════════════ Header ═══════════════ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold text-foreground">Skills</h1>
            <span className="text-xs text-muted-foreground">
              {enabledCount}/{skills.length} enabled
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════ Search ═══════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="搜索技能和工具集..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      {allCategories.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            type="button"
            className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
              !activeCategory
                ? "bg-primary text-primary-foreground border-primary shadow-sm hover:-translate-y-0.5"
                : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/50"
            }`}
            onClick={() => setActiveCategory(null)}
          >
            All ({skills.length})
          </button>
          {allCategories.map(({ key, name, count }) => (
            <button
              key={key}
              type="button"
              className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                activeCategory === key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm hover:-translate-y-0.5"
                  : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
              onClick={() =>
                setActiveCategory(activeCategory === key ? null : key)
              }
            >
              {name}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════ Skills by Category ═══════════════ */}
      <section className="flex flex-col gap-3">

        {filteredSkills.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {skills.length === 0
                ? "未找到技能。技能从 ~/.hermes/skills/ 加载"
                : "没有符合搜索或筛选条件的技能。"}
            </CardContent>
          </Card>
        ) : (
          categoryGroups.map(({ key, name, skills: catSkills, enabledCount: catEnabled }) => {
            const collapsed = isCollapsed(key);
            return (
              <Card key={key} className="shadow-sm hover:shadow-md transition-all duration-150">
                <CardHeader
                  className="cursor-pointer select-none py-3 px-4"
                  onClick={() => toggleCollapse(key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-sm font-medium text-foreground">{name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {catSkills.length} skill{catSkills.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <Badge
                      variant={catEnabled === catSkills.length ? "success" : "outline"}
                      className="text-[10px]"
                    >
                      {catEnabled}/{catSkills.length} enabled
                    </Badge>
                  </div>
                </CardHeader>

                {collapsed ? (
                  /* Peek: show first few skill names so collapsed isn't blank */
                  <div className="px-4 pb-3 flex items-center min-h-[28px]">
                    <p className="text-xs text-muted-foreground truncate leading-normal">
                      {catSkills.slice(0, 4).map((s) => s.name).join(", ")}
                      {catSkills.length > 4 && `, +${catSkills.length - 4} more`}
                    </p>
                  </div>
                ) : (
                  <CardContent className="pt-0 px-4 pb-3">
                    <div className="grid gap-1">
                      {catSkills.map((skill) => (
                        <div
                          key={skill.name}
                          className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                        >
                          <div className="pt-0.5 shrink-0">
                            <Switch
                              checked={skill.enabled}
                              onCheckedChange={() => handleToggleSkill(skill)}
                              disabled={togglingSkills.has(skill.name)}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className={`font-mono text-sm ${
                                  skill.enabled
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {skill.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {skill.description || "暂无描述。"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </section>

      {/* ═══════════════ Toolsets ═══════════════ */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Toolsets
          <span className="text-xs text-muted-foreground font-normal">
            ({filteredToolsets.length})
          </span>
        </h2>

        {filteredToolsets.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No toolsets match the search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredToolsets.map((ts) => {
              // Strip emoji prefix from label for cleaner display
              const labelText = ts.label.replace(/^[\p{Emoji}\s]+/u, "").trim() || ts.name;
              const emoji = ts.label.match(/^[\p{Emoji}]+/u)?.[0] || "🔧";

              return (
                <Card key={ts.name} className="relative overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-150">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl shrink-0 leading-none mt-0.5">{emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">{labelText}</span>
                          <Badge
                            variant={ts.enabled ? "success" : "outline"}
                            className="text-[10px]"
                          >
                            {ts.enabled ? "启用" : "停用"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                          {ts.description}
                        </p>
                        {ts.enabled && !ts.configured && (
                          <p className="text-[10px] text-amber-600 mb-2 font-medium">
                            Setup needed
                          </p>
                        )}
                        {ts.tools.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ts.tools.map((tool) => (
                              <Badge
                                key={tool}
                                variant="secondary"
                                className="text-[10px] font-mono"
                              >
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {ts.tools.length === 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {ts.enabled ? `${ts.name} toolset` : "命令行模式下已禁用"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}