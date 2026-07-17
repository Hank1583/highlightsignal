"use client";

import { Building2, ChevronDown, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

export default function WorkspaceSelector() {
  const {
    workspaces,
    currentWorkspace,
    loading,
    backendAvailable,
    errorMessage,
    selectWorkspace,
    refresh,
  } = useWorkspace();

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <Building2 className="hidden h-4 w-4 shrink-0 text-slate-500 sm:block" />
      <label className="relative min-w-0">
      <span className="sr-only">選擇 Workspace</span>
      <select
        value={currentWorkspace.id}
        disabled={loading || workspaces.length <= 1}
        onChange={(event) => selectWorkspace(Number(event.target.value))}
        aria-label="選擇 Workspace"
        className="w-28 max-w-full appearance-none truncate rounded-xl border border-slate-200 bg-white py-2 pr-7 pl-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default disabled:opacity-70 sm:w-40 sm:pl-3 sm:text-sm lg:w-52"
      >
        {workspaces.map((workspace) => (
          <option key={`${workspace.source}-${workspace.id}`} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </label>
      {!backendAvailable && !loading && (
        <button
          type="button"
          onClick={() => void refresh()}
          title={`${errorMessage || "Workspace backend 尚未就緒"}；按一下重試。`}
          aria-label="Workspace 服務未連線，按一下重試"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
