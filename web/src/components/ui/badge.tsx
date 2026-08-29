import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 font-sans text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-indigo-200 bg-indigo-50 text-indigo-700",
        secondary: "border-zinc-200 bg-zinc-100 text-zinc-700",
        destructive: "border-red-200 bg-red-50 text-red-700",
        outline: "border-zinc-200 bg-transparent text-zinc-600",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}