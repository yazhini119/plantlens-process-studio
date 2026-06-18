export function KpiStrip({ items }) {
  return (
    <section className="kpi-strip">
      {items.map((item) => (
        <article key={item.label} className={`kpi-card ${item.tone ?? 'normal'}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}
