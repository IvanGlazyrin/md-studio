import React from "react";
import {
  Info,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Bookmark,
} from "lucide-react";

export interface CalloutProps {
  type?: string;
  title?: string;
  children?: React.ReactNode;
}

const calloutStyles: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultTitle: string;
  }
> = {
  note: {
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/20",
    text: "text-cyan-400",
    icon: Info,
    defaultTitle: "Примечание",
  },
  info: {
    border: "border-sky-500/40",
    bg: "bg-sky-950/20",
    text: "text-sky-400",
    icon: Info,
    defaultTitle: "Информация",
  },
  tip: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/20",
    text: "text-emerald-400",
    icon: Lightbulb,
    defaultTitle: "Совет",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    text: "text-amber-400",
    icon: AlertTriangle,
    defaultTitle: "Внимание",
  },
  caution: {
    border: "border-orange-500/40",
    bg: "bg-orange-950/20",
    text: "text-orange-400",
    icon: AlertTriangle,
    defaultTitle: "Осторожно",
  },
  danger: {
    border: "border-rose-500/40",
    bg: "bg-rose-950/20",
    text: "text-rose-400",
    icon: AlertCircle,
    defaultTitle: "Опасно",
  },
  bug: {
    border: "border-rose-500/40",
    bg: "bg-rose-950/20",
    text: "text-rose-400",
    icon: AlertCircle,
    defaultTitle: "Баг",
  },
  success: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/20",
    text: "text-emerald-400",
    icon: CheckCircle2,
    defaultTitle: "Успех",
  },
};

export function Callout({ type = "note", title, children }: CalloutProps) {
  const normType = type.toLowerCase();
  const config = calloutStyles[normType] || {
    border: "border-slate-700",
    bg: "bg-slate-900/40",
    text: "text-slate-300",
    icon: Bookmark,
    defaultTitle: normType ? normType.charAt(0).toUpperCase() + normType.slice(1) : "Заметка",
  };

  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div
      className={`callout callout-${normType} my-5 rounded-xl border ${config.border} ${config.bg} p-4 text-sm shadow-lg`}
      data-callout-type={normType}
      data-callout-title={displayTitle}
    >
      <div className={`mb-2 flex items-center gap-2 font-bold ${config.text}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{displayTitle}</span>
      </div>
      <div className="text-slate-300 leading-relaxed [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
