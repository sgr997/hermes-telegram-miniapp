import { useEffect, useState, useRef } from "react";
import { Send, StopCircle, Paperclip, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ModelInfo } from "@/lib/api";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";

interface ChatMsg {
  role: "user" | "assistant" | "system" | "command";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (attempt = 0) => {
      api
        .getModelInfo()
        .then((info) => {
          if (!cancelled) setModelInfo(info);
        })
        .catch(() => {
          if (!cancelled && attempt < 3) {
            setTimeout(() => load(attempt + 1), 800 * (attempt + 1));
          }
        });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileAttach = () => {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = "image/*";
    el.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({ name: file.name, dataUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    };
    el.click();
  };

  const abortStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !attachedFile) return;
    if (streaming) return;

    const displayText = text || "(图片)";
    setInput("");
    setStreaming(true);

    // Build the message content
    let content = text;
    if (attachedFile && text) {
      content = `${text}\n[Attached image: ${attachedFile.name}]`;
    } else if (attachedFile) {
      content = `[Attached image: ${attachedFile.name}]`;
    }
    setAttachedFile(null);

    // Show user message
    setMessages((prev) => [...prev, { role: "user", content: displayText }]);

    // Slash commands — proxy to command endpoint
    if (text.startsWith("/")) {
      const parts = text.split(/\s+/);
      const cmd = parts[0].slice(1);
      const args = parts.slice(1).join(" ");
      try {
        const r = await api.executeCommand({ command: "/" + cmd, args });
        setMessages((prev) => [
          ...prev,
          { role: "command", content: r.output || "(无输出)" },
        ]);
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `Error: ${e.message}` },
        ]);
      }
      setStreaming(false);
      return;
    }

    // Build message history for the API
    // Send last N messages for context (plus the new one)
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content });

    // Stream response via gateway API
    const controller = new AbortController();
    abortRef.current = controller;
    let assistantContent = "";

    // Create placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      for await (const delta of api.streamChat(history, {
        sessionId: sessionIdRef.current || undefined,
        onSessionId: (id) => { sessionIdRef.current = id; },
      })) {
        if (controller.signal.aborted) break;
        assistantContent += delta;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      }
    } catch (e: any) {
      if (!controller.signal.aborted) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "system",
            content: `Error: ${e.message}`,
          };
          return updated;
        });
      }
    }

    abortRef.current = null;
    setStreaming(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Context bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card text-xs text-muted-foreground shrink-0">
        <span className="font-medium text-foreground">{modelInfo?.model_short || "加载中…"}</span>
        {modelInfo?.provider && <span className="opacity-60">via {modelInfo.provider}</span>}
        <span className="opacity-30">|</span>
        <span className="text-green-600">● Ready</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-sans font-semibold mb-1 text-foreground">Hermes Agent</p>
            <p className="text-sm opacity-60">Send a message to start chatting</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm transition-all ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : msg.role === "system"
                    ? "bg-red-50 text-red-700 border border-red-200 italic"
                    : msg.role === "command"
                      ? "bg-muted text-foreground font-mono text-xs whitespace-pre-wrap border border-border"
                      : "bg-card text-foreground border border-border"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
                  {streaming && i === messages.length - 1 && !msg.content ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
                      <span className="text-xs">Thinking…</span>
                    </div>
                  ) : (
                    <>
                      <Markdown content={msg.content} />
                      {streaming && i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Attachment preview */}
      {attachedFile && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-card text-xs">
          <Paperclip className="h-3 w-3 text-muted-foreground" />
          <span className="truncate text-foreground">{attachedFile.name}</span>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={handleFileAttach}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <textarea
          ref={inputRef}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary min-h-[38px] max-h-[120px] transition-colors"
          placeholder="给 Hermes 发消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={streaming}
        />
        {streaming ? (
          <Button variant="destructive" size="icon" className="shrink-0 h-9 w-9" onClick={abortStream}>
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" className="shrink-0 h-9 w-9" onClick={send} disabled={!input.trim() && !attachedFile}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}