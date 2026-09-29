// Minimal type only (PRD section 20). Task rules arrive in M7.
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}
