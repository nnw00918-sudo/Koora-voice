import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, onClick, onFocus, ...props }, ref) => {
  const handleClick = (e) => {
    // Ensure the input gets focus on click
    e.target.focus();
    if (onClick) onClick(e);
  };

  const handleFocus = (e) => {
    // Select the input on focus for better UX
    e.target.setSelectionRange(e.target.value.length, e.target.value.length);
    if (onFocus) onFocus(e);
  };

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      onClick={handleClick}
      onFocus={handleFocus}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      {...props}
    />
  );
})
Input.displayName = "Input"

export { Input }
