type Props = { lines: string[]; accent?: boolean; as?: 'h1' | 'h2' };

/** Animate complete words so Arabic letter connections and screen-reader text stay intact. */
export default function MotionHeading({ lines, accent = false, as: Tag = 'h2' }: Props) {
  return <Tag data-motion-heading aria-label={lines.join(' ')}>{lines.map((line, i) =>
    <span className={`heading-line ${accent && i === lines.length - 1 ? 'is-accent' : ''}`} key={`${i}-${line}`} aria-hidden="true">
      {line.split(/\s+/).map((word, j) => <span key={`${j}-${word}`}><span className="word-window"><span className="motion-word">{word}</span></span>{' '}</span>)}
    </span>
  )}</Tag>;
}
