import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  action,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("flex justify-between items-center mb-8", className)}>
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          {typeof title === 'string' ? title : <div className="flex">{title}</div>}
        </h1>
        {description && (
          typeof description === 'string' 
            ? <p className="text-gray-500">{description}</p>
            : <div className="text-gray-500">{description}</div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
