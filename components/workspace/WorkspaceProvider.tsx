"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Workspace } from "@/types/workspace";
import { useRouter } from "next/navigation";

type WorkspaceContextValue = {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  loading: boolean;
  backendAvailable: boolean;
  errorMessage: string;
  selectWorkspace: (workspaceId: number) => void;
  refresh: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

type Props = {
  memberId: string;
  memberName: string;
  children: React.ReactNode;
};

function legacyWorkspace(memberId: string, memberName: string): Workspace {
  return {
    id: Number(memberId),
    name: memberName ? `${memberName} 的 Workspace` : "My Workspace",
    slug: `legacy-${memberId}`,
    status: "active",
    role: "owner",
    locale: "zh-TW",
    timezone: "Asia/Taipei",
    source: "legacy",
  };
}

function normalizeWorkspace(value: unknown): Workspace | null {
  const item = value as Partial<Workspace>;
  const id = Number(item?.id);
  if (!Number.isInteger(id) || id <= 0 || !item?.name) {
    return null;
  }

  return {
    id,
    public_id: item.public_id ? String(item.public_id) : undefined,
    name: String(item.name),
    slug: String(item.slug || `workspace-${id}`),
    status: String(item.status || "active"),
    role: String(item.role || "member"),
    locale: item.locale ? String(item.locale) : "zh-TW",
    timezone: item.timezone ? String(item.timezone) : "Asia/Taipei",
    source: "backend",
  };
}

export default function WorkspaceProvider({
  memberId,
  memberName,
  children,
}: Props) {
  const router = useRouter();
  const fallback = useMemo(
    () => legacyWorkspace(memberId, memberName),
    [memberId, memberName]
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([fallback]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<Workspace>(fallback);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const storageKey = `highlight-signal.workspace.${memberId}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/workspaces", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      const loaded = Array.isArray(payload?.data)
        ? payload.data
            .map(normalizeWorkspace)
            .filter((item: Workspace | null): item is Workspace => item !== null)
        : [];

      if (!response.ok || !payload?.ok || loaded.length === 0) {
        throw new Error("Workspace backend is not ready");
      }

      const storedId = Number(window.localStorage.getItem(storageKey));
      const selected =
        loaded.find((workspace: Workspace) => workspace.id === storedId) ||
        loaded[0];

      setWorkspaces(loaded);
      setCurrentWorkspace(selected);
      setBackendAvailable(true);
      window.localStorage.setItem(storageKey, String(selected.id));

      const cookieWorkspaceId = document.cookie
        .split("; ")
        .find((item) => item.startsWith("hs_workspace_id="))
        ?.split("=")[1];

      if (Number(cookieWorkspaceId) !== selected.id) {
        document.cookie = `hs_workspace_id=${selected.id}; Path=/; SameSite=Lax; Max-Age=31536000`;
        router.refresh();
      }
    } catch (error) {
      setWorkspaces([fallback]);
      setCurrentWorkspace(fallback);
      setBackendAvailable(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Workspace 服務目前無法使用"
      );
    } finally {
      setLoading(false);
    }
  }, [fallback, router, storageKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectWorkspace = useCallback(
    (workspaceId: number) => {
      const selected = workspaces.find(
        (workspace) => workspace.id === workspaceId
      );
      if (!selected) return;

      setCurrentWorkspace(selected);
      window.localStorage.setItem(storageKey, String(selected.id));
      document.cookie = `hs_workspace_id=${selected.id}; Path=/; SameSite=Lax; Max-Age=31536000`;
      router.refresh();
    },
    [router, storageKey, workspaces]
  );

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      loading,
      backendAvailable,
      errorMessage,
      selectWorkspace,
      refresh,
    }),
    [
      workspaces,
      currentWorkspace,
      loading,
      backendAvailable,
      errorMessage,
      selectWorkspace,
      refresh,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}
