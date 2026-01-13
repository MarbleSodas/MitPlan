import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-10 w-full rounded-lg border-2 border-input bg-card px-3 py-2 text-base md:text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 hover:border-muted-foreground/50",
        compact:
          "h-8 w-auto min-w-[3rem] rounded-md border border-input bg-background px-2 py-1 text-sm text-center tabular-nums focus:border-primary focus:ring-1 focus:ring-ring/20 hover:border-muted-foreground/50 [field-sizing:content] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        inline:
          "h-auto w-auto min-w-[1.25rem] rounded border border-input bg-background px-1 py-0.5 text-sm text-center tabular-nums focus:border-primary hover:border-muted-foreground/50 [field-sizing:content] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
