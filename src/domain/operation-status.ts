export const OPERATION_STATUSES = ["PENDING", "UNDER_REVIEW", "COMPLETED", "CANCELED"] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

const transitions: Record<OperationStatus, readonly OperationStatus[]> = {
  PENDING: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

export function canChangeStatus(from: OperationStatus, to: OperationStatus): boolean {
  return transitions[from].includes(to);
}
