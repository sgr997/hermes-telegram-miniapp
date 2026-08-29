import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-sm font-medium rounded-lg transition-all duration-150 ease-out cursor-pointer"
  + " disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-[#4338ca]",
        destructive: "bg-[#dc2626] text-white hover:bg-[#b91c1c]",
        outline: "border border-border bg-transparent text-foreground hover:bg-[#f4f4f5]",
        secondary: "bg-[#f4f4f5] text-foreground hover:bg-[#e4e4e7]",
        ghost: "bg-transparent text-foreground hover:bg-[#f4f4f5]",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}