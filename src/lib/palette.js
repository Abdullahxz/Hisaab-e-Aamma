// Categorical palette keyed by flow role, validated with the dataviz skill's
// checker (validate_palette.js) for both light and dark surfaces.
//   income   -> aqua    (#1baf7a / #199e70)
//   spending -> orange  (#eb6834 / #d95926)
//   transfer -> violet  (#4a3aa7 / #9085e9)   [the NFC transfer to provinces]
//   hub      -> neutral slate (structural nodes)
// Node labels are always visible, which satisfies the light-mode relief rule
// for the aqua slot (contrast 2.74:1 < 3:1).

export const ROLE_COLORS = {
  light: {
    receipt: '#1baf7a',
    expenditure: '#eb6834',
    transfer: '#4a3aa7',
    hub: '#64748b',
  },
  dark: {
    receipt: '#199e70',
    expenditure: '#d95926',
    transfer: '#9085e9',
    hub: '#94a3b8',
  },
}

export const ROLE_LABELS = {
  receipt: 'Money in (revenue & financing)',
  transfer: 'Transferred to provinces',
  expenditure: 'Federal spending',
  hub: 'Pooled resources',
}

// Order the legend is shown in (left-to-right narrative).
export const LEGEND_ROLES = ['receipt', 'transfer', 'expenditure']

export function colorForRole(role, mode = 'light') {
  const table = ROLE_COLORS[mode] || ROLE_COLORS.light
  return table[role] || table.hub
}
