import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  rightAction?: ReactNode;
}

export function PageHeader({ title, rightAction }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-14 pb-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-text-primary">
          {title}
        </h1>
        <div className="mt-2 h-[3px] w-7 bg-text-primary" />
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
