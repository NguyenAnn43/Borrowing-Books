import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, leftIcon, rightIcon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "block w-full h-11 px-4 rounded-lg border transition-all duration-200",
                            "bg-white text-gray-900 placeholder-gray-400",
                            "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
                            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                            leftIcon && "pl-10",
                            rightIcon && "pr-10",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export { Input };
