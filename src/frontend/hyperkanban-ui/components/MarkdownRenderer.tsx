import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const components: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2 text-gray-900">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold mt-3 mb-1 text-gray-900">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold mt-2 mb-1 text-gray-900">{children}</h4>,
  p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through text-gray-500">{children}</del>,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 pl-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 pl-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">{children}</blockquote>
  ),
  code: ({ className: cls, children }) => {
    const isBlock = cls?.startsWith('language-');
    return isBlock ? (
      <code className="block bg-gray-100 text-gray-800 rounded p-3 my-2 text-sm font-mono overflow-x-auto whitespace-pre">
        {children}
      </code>
    ) : (
      <code className="bg-gray-100 text-red-600 rounded px-1 py-0.5 text-sm font-mono">{children}</code>
    );
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  hr: () => <hr className="my-4 border-gray-200" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border border-gray-200 rounded text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-gray-700 border-b border-gray-100">{children}</td>,
  tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`text-gray-800 text-sm leading-relaxed ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
