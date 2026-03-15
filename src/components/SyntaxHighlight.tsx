import { Highlight, themes } from 'prism-react-renderer'

interface SyntaxHighlightProps {
  code: string
  language?: string
  className?: string
}

/**
 * Shared syntax highlighter using prism-react-renderer.
 * Replaces the hand-rolled JsonView with proper token-level highlighting.
 */
export function SyntaxHighlight({ code, language = 'json', className }: SyntaxHighlightProps) {
  return (
    <Highlight theme={themes.nightOwl} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`text-xs leading-relaxed whitespace-pre-wrap break-all ${className ?? ''}`}
          style={{ background: 'transparent', margin: 0, padding: 0 }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}

/** Format unknown data as pretty JSON string */
export function toJsonString(data: unknown): string {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}
