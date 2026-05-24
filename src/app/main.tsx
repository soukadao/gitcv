import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "../shared/ui/layout";
import { TaskPage } from "../pages/task/task";
import type { TaskSummary } from "../pages/task/task-parse";
import { fetchTasks } from "../pages/task/api/tasks";
import "../shared/ui/global.css";
import "github-markdown-css/github-markdown-dark.css";

function App() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);

  useEffect(() => {
    fetchTasks().then(setTasks).catch(console.error);
  }, []);

  return (
    <Layout>
      <TaskPage tasks={tasks} />
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
