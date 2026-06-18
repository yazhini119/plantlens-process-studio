export const stateStyles = {
  inactive: {
    fill: '#ebeeef',
    secondary: '#d7dde0',
    edge: '#a3aeb4',
    label: '#6c7780',
    opacity: 0.4,
    ring: '#a8b2b8',
  },
  normal: {
    fill: '#ecf5f0',
    secondary: '#cfe2d8',
    edge: '#17805e',
    label: '#0f6f51',
    opacity: 0.84,
    ring: '#17805e',
  },
  warning: {
    fill: '#faf5e7',
    secondary: '#ecdba6',
    edge: '#d2a400',
    label: '#8a6700',
    opacity: 0.94,
    ring: '#d2a400',
  },
  impacted: {
    fill: '#faf0e7',
    secondary: '#efc89d',
    edge: '#d67b1f',
    label: '#8b4b0b',
    opacity: 0.96,
    ring: '#d67b1f',
  },
  origin: {
    fill: '#fff1f0',
    secondary: '#ffd0ca',
    edge: '#d62d2d',
    label: '#d62d2d',
    opacity: 1,
    ring: '#d62d2d',
  },
  alarm: {
    fill: '#faf0e7',
    secondary: '#efc89d',
    edge: '#d67b1f',
    label: '#8b4b0b',
    opacity: 0.96,
    ring: '#d67b1f',
  },
  downstream: {
    fill: '#f6f2e6',
    secondary: '#ecd8a8',
    edge: '#d9a22a',
    label: '#7d651d',
    opacity: 0.8,
    ring: '#efb23a',
  },
  selected: {
    fill: '#eef6ff',
    secondary: '#cfe2f5',
    edge: '#2d75c7',
    label: '#1d5eb6',
    opacity: 1,
    ring: '#1d5eb6',
  },
}

export function resolveStyle(status, selected = false) {
  return selected ? stateStyles.selected : stateStyles[status] ?? stateStyles.normal
}
