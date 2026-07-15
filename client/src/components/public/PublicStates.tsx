import { AlertTriangle, Inbox, SearchX } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PublicEmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Empty className="mt-panel">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
}

/** A genuine, unexpected failure (not "no data yet") — server errors, network failures. */
export function PublicErrorState({
  title = "Something went wrong",
  message,
}: ErrorStateProps) {
  return (
    <Empty className="mt-panel border-[var(--mt-danger)]/40">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-[var(--mt-danger)]/15 text-[var(--mt-danger)]"
        >
          <AlertTriangle aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** A specifically-requested resource (tournament slug, id) that doesn't exist. */
export function PublicNotFoundState({
  title = "Not found",
  message,
}: ErrorStateProps) {
  return (
    <Empty className="mt-panel">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function PublicLoadingCards({
  count = 3,
  label = "Loading content",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label={label}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="mt-panel space-y-3 p-5">
          <Skeleton className="h-4 w-2/3 bg-[var(--mt-steel)]" />
          <Skeleton className="h-3 w-1/2 bg-[var(--mt-steel)]" />
          <Skeleton className="h-16 w-full bg-[var(--mt-steel)]" />
        </div>
      ))}
    </div>
  );
}
