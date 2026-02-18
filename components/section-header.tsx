interface SectionHeaderProps {
  label: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ label, action, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium">
        {label}
      </span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[13px] text-text-primary cursor-pointer"
        >
          {action}
        </button>
      )}
    </div>
  );
}
