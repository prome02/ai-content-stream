'use client'

interface Option {
  value: string
  label: string
  description: string
}

interface OptionSelectorProps {
  title: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

export default function OptionSelector({ title, options, value, onChange }: OptionSelectorProps) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`text-left px-3 py-2 rounded-lg border transition-all text-sm ${
              value === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium">{option.label}</div>
            <div className="text-xs mt-0.5 opacity-75">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
