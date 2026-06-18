import { Clock3, Maximize2, Minimize2 } from 'lucide-react'

export function TimelineRail({ items, highlighted = false, collapsed = false, onToggle }) {
  if (collapsed) {
    return (
      <button className="timeline-dock" onClick={onToggle} type="button">
        <Clock3 size={15} />
        <span>Timeline</span>
        <Maximize2 size={15} />
      </button>
    )
  }

  return (
    <section className={`timeline-rail ${highlighted ? 'highlighted' : ''}`}>
      <header>
        <div className="timeline-title">
          <Clock3 size={16} />
          <strong>Fault timeline</strong>
        </div>
        <button className="icon-chip" title="Collapse timeline" onClick={onToggle} type="button">
          <Minimize2 size={15} />
        </button>
      </header>
      <div className="timeline-list">
        {items.map((item) => (
          <article key={`${item.time}-${item.event}`} className="timeline-item">
            <span>{item.time}</span>
            <strong>{item.event}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
