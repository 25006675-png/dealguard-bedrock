import { Shield } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-md bg-brand text-on-brand">
        <Shield size={15} strokeWidth={2.5} aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">DealGuard MY</span>
    </Link>
  );
}
