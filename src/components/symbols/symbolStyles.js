export const stateStyles = {
  inactive: {
    fill: '#e9eceb',
    secondary: '#d5dcda',
    edge: '#bcc7c7',
    label: '#4e5c64',
    opacity: 0.34,
    ring: '#aeb9b9',
  },
  normal: {
    fill: '#e7eceb',
    secondary: '#cdd8d7',
    edge: '#829294',
    label: '#53606a',
    opacity: 0.72,
    ring: '#97a7a7',
  },
  origin: {
    fill: '#fff0ec',
    secondary: '#ffd5cd',
    edge: '#ef2f2f',
    label: '#ef2f2f',
    opacity: 1,
    ring: '#ef2f2f',
  },
  alarm: {
    fill: '#f6f0e6',
    secondary: '#ead8b8',
    edge: '#d99a22',
    label: '#3a4248',
    opacity: 0.92,
    ring: '#efb23a',
  },
  downstream: {
    fill: '#eef1f1',
    secondary: '#d7dfdf',
    edge: '#aebabc',
    label: '#3a4248',
    opacity: 0.54,
    ring: '#f3b11d',
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
