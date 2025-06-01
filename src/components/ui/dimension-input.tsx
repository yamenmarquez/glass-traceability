// src/components/ui/dimension-input.tsx - Natural dimension input (e.g., "80 1/16")
'use client'

import { useState, useEffect } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface DimensionInputProps {
  value: { inches: number; fraction: string }
  onChange: (value: { inches: number; fraction: string }) => void
  placeholder?: string
  className?: string
  label?: string
  disabled?: boolean
}

const VALID_FRACTIONS = [
  '0', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16', 
  '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16'
]

// Convert fraction string to decimal
const fractionToDecimal = (fraction: string): number => {
  const fractionMap: Record<string, number> = {
    '0': 0,
    '1/16': 0.0625,
    '1/8': 0.125,
    '3/16': 0.1875,
    '1/4': 0.25,
    '5/16': 0.3125,
    '3/8': 0.375,
    '7/16': 0.4375,
    '1/2': 0.5,
    '9/16': 0.5625,
    '5/8': 0.625,
    '11/16': 0.6875,
    '3/4': 0.75,
    '13/16': 0.8125,
    '7/8': 0.875,
    '15/16': 0.9375
  }
  return fractionMap[fraction] || 0
}

// Convert decimal to closest fraction
const decimalToFraction = (decimal: number): string => {
  const fractionValues = [
    { fraction: '0', value: 0 },
    { fraction: '1/16', value: 0.0625 },
    { fraction: '1/8', value: 0.125 },
    { fraction: '3/16', value: 0.1875 },
    { fraction: '1/4', value: 0.25 },
    { fraction: '5/16', value: 0.3125 },
    { fraction: '3/8', value: 0.375 },
    { fraction: '7/16', value: 0.4375 },
    { fraction: '1/2', value: 0.5 },
    { fraction: '9/16', value: 0.5625 },
    { fraction: '5/8', value: 0.625 },
    { fraction: '11/16', value: 0.6875 },
    { fraction: '3/4', value: 0.75 },
    { fraction: '13/16', value: 0.8125 },
    { fraction: '7/8', value: 0.875 },
    { fraction: '15/16', value: 0.9375 }
  ]

  // Find closest fraction
  let closest = fractionValues[0]
  let minDiff = Math.abs(decimal - closest.value)

  for (const fv of fractionValues) {
    const diff = Math.abs(decimal - fv.value)
    if (diff < minDiff) {
      minDiff = diff
      closest = fv
    }
  }

  return closest.fraction
}

// Parse input like "80 1/16" or "80.0625" or "80" into inches and fraction
const parseInput = (input: string): { inches: number; fraction: string } => {
  const trimmed = input.trim()
  
  // Handle empty input
  if (!trimmed) {
    return { inches: 0, fraction: '0' }
  }

  // Check for space-separated format: "80 1/16"
  const spaceMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+(\d+\/\d+)$/)
  if (spaceMatch) {
    const inches = parseInt(spaceMatch[1])
    const fraction = spaceMatch[2]
    if (VALID_FRACTIONS.includes(fraction)) {
      return { inches, fraction }
    }
  }

  // Check for decimal format: "80.0625"
  const decimalMatch = trimmed.match(/^(\d+)\.(\d+)$/)
  if (decimalMatch) {
    const wholeInches = parseInt(decimalMatch[1])
    const decimal = parseFloat(`0.${decimalMatch[2]}`)
    const fraction = decimalToFraction(decimal)
    return { inches: wholeInches, fraction }
  }

  // Check for whole number: "80"
  const wholeMatch = trimmed.match(/^\d+$/)
  if (wholeMatch) {
    return { inches: parseInt(trimmed), fraction: '0' }
  }

  // Check for just fraction: "1/16"
  const fractionMatch = trimmed.match(/^(\d+\/\d+)$/)
  if (fractionMatch && VALID_FRACTIONS.includes(fractionMatch[1])) {
    return { inches: 0, fraction: fractionMatch[1] }
  }

  // Invalid input, return current or default
  return { inches: 0, fraction: '0' }
}

// Format dimension for display
const formatDimension = (inches: number, fraction: string): string => {
  if (inches === 0 && fraction === '0') {
    return ''
  }
  if (fraction === '0') {
    return inches.toString()
  }
  if (inches === 0) {
    return fraction
  }
  return `${inches} ${fraction}`
}

export function DimensionInput({ 
  value, 
  onChange, 
  placeholder = "e.g., 80 1/16", 
  className,
  label,
  disabled = false
}: DimensionInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Update input value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatDimension(value.inches, value.fraction))
    }
  }, [value, isFocused])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Parse and update if valid
    const parsed = parseInput(newValue)
    if (parsed.inches !== value.inches || parsed.fraction !== value.fraction) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Reformat the input on blur
    const parsed = parseInput(inputValue)
    const formatted = formatDimension(parsed.inches, parsed.fraction)
    setInputValue(formatted)
    onChange(parsed)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn(className)}
        disabled={disabled}
      />
      <div className="text-xs text-gray-500">
        Enter: "80 1/16", "80.0625", or "80"
      </div>
    </div>
  )
}