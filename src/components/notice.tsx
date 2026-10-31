import { Icon } from "@/components/icon";
export function Notice({
  children,
  success = false,
}: {
  children: React.ReactNode;
  success?: boolean;
}) {
  return (
    <div
      role={success ? "status" : "alert"}
      className={`notice ${success ? "notice-success" : "notice-error"}`}
    >
      <Icon name={success ? "check" : "info"} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
