"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmActionButton({
  label,
  pendingLabel,
  confirmMessage,
  className,
  action,
}: {
  label: string;
  pendingLabel: string;
  confirmMessage: string;
  className: string;
  action: () => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className={`${className} no-print`}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
