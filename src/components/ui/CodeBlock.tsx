import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  className?: string
  showLineNumbers?: boolean
}

const tokenize = (code: string, language: string) => {
  const keywords = ['import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return', 'new', 'class', 'extends', 'await', 'async', 'if', 'else', 'for', 'while', 'of', 'in', 'true', 'false', 'null', 'undefined', 'type', 'interface', 'enum']
  const lines = code.split('\n')

  return lines.map((line) => {
    let html = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Strings
    html = html.replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, '<span style="color:#a3e635">$1$2$1</span>')
    // Comments
    html = html.replace(/(\/\/.*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>')
    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fb923c">$1</span>')
    // Keywords
    keywords.forEach(kw => {
      html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span style="color:#c084fc">$1</span>')
    })
    // Function calls / properties
    html = html.replace(/(\w+)(?=\()/g, '<span style="color:#60a5fa">$1</span>')
    // Object keys
    html = html.replace(/(\w+)(?=\s*:)/g, '<span style="color:#f1f5f9">$1</span>')

    return html
  }).join('\n')
}

export default function CodeBlock({ code, language = 'js', filename, className, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlighted = tokenize(code, language)
  const lines = highlighted.split('\n')

  return (
    <div className={cn('relative group rounded-2xl overflow-hidden', className)}>
      <div className="absolute inset-0 bg-white/4 border border-white/8 rounded-2xl" />

      {filename && (
        <div className="relative flex items-center justify-between px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="font-mono text-xs text-white/40 ml-2">{filename}</span>
          </div>
          <span className="text-xs text-white/30 font-mono uppercase">{language}</span>
        </div>
      )}

      <div className="relative overflow-auto">
        <button
          onClick={copy}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/6 hover:bg-white/12 border border-white/8 text-white/40 hover:text-white/80 transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>

        <pre className="relative px-5 py-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  {showLineNumbers && (
                    <td className="pr-4 text-right text-white/20 font-mono text-sm select-none w-8 shrink-0">
                      {i + 1}
                    </td>
                  )}
                  <td className="font-mono text-sm text-white/80 w-full">
                    <code dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </pre>
      </div>
    </div>
  )
}

export function InlineCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm bg-white/5 hover:bg-white/8 border border-white/10 text-white/80 transition-all duration-200 group"
    >
      <span className="text-green-400/80">$</span>
      <span>{children}</span>
      {copied
        ? <Check size={12} className="text-green-400 shrink-0" />
        : <Copy size={12} className="text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
      }
    </button>
  )
}
