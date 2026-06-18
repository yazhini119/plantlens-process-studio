import { HugeiconsIcon } from '@hugeicons/react'
import ChartLineData01Icon from '@hugeicons/core-free-icons/ChartLineData01Icon'
import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon'
import ViewIcon from '@hugeicons/core-free-icons/ViewIcon'

export function KpiStrip({ items, collapsed = false, onToggle }) {
  if (collapsed) {
    const primary = items[0]
    return (
      <button className="signal-tray-dock" type="button" onClick={onToggle} title="Open live signal tray">
        <HugeiconsIcon icon={DashboardSpeed02Icon} size={18} strokeWidth={1.8} />
        <span>Signals</span>
        <strong>{primary ? `${primary.label}: ${primary.value}` : 'Open'}</strong>
        <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={1.8} />
      </button>
    )
  }

  return (
    <section className="kpi-strip">
      <button className="signal-tray-close" type="button" onClick={onToggle} title="Collapse live signal tray">
        <HugeiconsIcon icon={ChartLineData01Icon} size={16} strokeWidth={1.8} />
        <span>Live signals</span>
      </button>
      {items.map((item) => (
        <article key={item.label} className={`kpi-card ${item.tone ?? 'normal'}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}
