// src/types/tasks.ts
export type TaskStatus = "planning" | "needs_review" | "approved" | "in_process" | "blocked" | "preview" | "completed" | "cancelled";
export type TaskType = "feature" | "bugfix";

export interface Task {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  task_type: TaskType;
  branch_name: string | null;
  pr_url: string | null;
  pr_number: number | null;
  vercel_preview_url: string | null;
  vercel_deployment_id: string | null;
  github_repo: string;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskDocument {
  id: string;
  task_id: string;
  file_name: string;
  doc_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  note: string | null;
}

export interface TaskDetail extends Task {
  documents: TaskDocument[];
  history: TaskHistory[];
}
