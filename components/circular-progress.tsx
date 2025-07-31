"use client";

import { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number; // The moyenne value (0-20)
  maxValue?: number; // Maximum possible value (default 20)
  size?: number; // Size of the circle
  strokeWidth?: number; // Width of the progress stroke
  className?: string;
  showValue?: boolean;
  label?: string;
  color?: string;
}

export function CircularProgress({
  value,
  maxValue = 20,
  size = 200,
  strokeWidth = 16,
  className = "",
  showValue = true,
  label = "",
  color,
}: CircularProgressProps) {
  const [progress, setProgress] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = (value / maxValue) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(percentage);
    }, 100);

    // Animate the displayed value
    const valueTimer = setInterval(() => {
      setDisplayValue((prev) => {
        const increment = value / 50; // Animate over ~1 second (50 * 20ms)
        const next = prev + increment;
        if (next >= value) {
          clearInterval(valueTimer);
          return value;
        }
        return next;
      });
    }, 20);

    return () => {
      clearTimeout(timer);
      clearInterval(valueTimer);
    };
  }, [value, percentage]);
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={
            color ? (color === "text-red-700" ? "red" : "#005EDD") : "#005EDD"
          }
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <>
            <span
              className={`text-4xl font-bold ${
                color ? color : "text-blue-600"
              }`}
              style={{ color: color ? "" : "#005EDD" }}
            >
              {displayValue ? displayValue.toFixed(2) : "0.00"}
            </span>
            {label && (
              <span
                className={`text-lg font-medium mt-1 ${color && color}`}
                style={{ color: color ? "" : "#005EDD" }}
              >
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
