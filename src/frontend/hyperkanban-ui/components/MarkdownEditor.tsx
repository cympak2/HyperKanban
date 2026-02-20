'use client';

import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  rows = 5,
  placeholder = 'Write markdown here...',
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${className ?? ''}`}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={`px-4 py-2 text-sm font-medium transition ${
            tab === 'write'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition ${
            tab === 'preview'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Preview
        </button>
        <span className="ml-auto flex items-center pr-3 text-xs text-gray-400 select-none">
          Markdown supported
        </span>
      </div>

      {/* Write tab */}
      {tab === 'write' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-4 py-3 focus:outline-none resize-y font-mono text-sm"
        />
      ) : (
        /* Preview tab */
        <div className="px-4 py-3 min-h-[80px]">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-gray-400 text-sm italic">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
}
