interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function Select({ value, onChange, options }: Props) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-gray-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 rounded-lg pl-3 pr-8 py-1.5 text-sm cursor-pointer focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 hover:border-gray-400 dark:hover:border-zinc-600 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
