import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "../shared/ui/layout";
import { TaskPage } from "../pages/task/task";
import type { TaskSummary } from "../pages/task/task-parse";
import { fetchTasks } from "../pages/task/api/tasks";
import "../shared/ui/global.css";
import "github-markdown-css/github-markdown-dark.css";

function App() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const refreshTasks = useCallback(async () => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setIsRefreshing(true);
    try {
      const nextTasks = await fetchTasks({ signal: controller.signal });
      setTasks(nextTasks);
      setRefreshError(null);
      setLastUpdatedAt(new Date());
    } catch (error) {
      if (controller.signal.aborted) return;
      setRefreshError(error instanceof Error ? error.message : "Failed to refresh tasks");
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshTasks();
    const intervalId = window.setInterval(() => void refreshTasks(), 5000);

    return () => {
      window.clearInterval(intervalId);
      activeRequestRef.current?.abort();
    };
  }, [refreshTasks]);

  return (
    <Layout>
      <TaskPage
        tasks={tasks}
        isRefreshing={isRefreshing}
        refreshError={refreshError}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={refreshTasks}
      />
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
