import { useState } from 'react';

export default function UrlInputForm({ onSubmit, isLoading }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!/^https?:\/\/.+\..+/.test(trimmed)) {
      setError('Enter a full URL, including https://');
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`flex items-center gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors ${
          error ? 'border-critical' : 'border-hairline focus-within:border-seo'
        }`}
      >
        <span className="font-mono text-sm text-geo select-none">analyze &gt;</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com/your-page"
          disabled={isLoading}
          className="flex-1 bg-transparent font-mono text-sm text-ash placeholder:text-dim outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 rounded-md bg-seo px-4 py-1.5 font-mono text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Scanning…' : 'Run scan'}
        </button>
      </div>
      {error && <p className="mt-2 font-mono text-xs text-critical">{error}</p>}
    </form>
  );
}
