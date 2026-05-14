// Estilos compartidos por resultado de instrucción.
// Usado en: ExecutionLog, InstructionInput
export const RESULT_CONFIG = {
  TLB_HIT: {
    label: 'TLB HIT',
    row:    'bg-emerald-500/5 hover:bg-emerald-500/10',
    badge:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    dot:    'bg-emerald-400',
    border: 'border-green-700',
    text:   'text-green-400',
  },
  TLB_MISS: {
    label: 'TLB MISS',
    row:    'bg-yellow-500/5 hover:bg-yellow-500/10',
    badge:  'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    dot:    'bg-yellow-400',
    border: 'border-yellow-600',
    text:   'text-yellow-400',
  },
  PAGE_FAULT: {
    label: 'PAGE FAULT',
    row:    'bg-red-500/5 hover:bg-red-500/10',
    badge:  'bg-red-500/20 text-red-300 border border-red-500/30',
    dot:    'bg-red-400',
    border: 'border-red-700',
    text:   'text-red-400',
  },
  CONTEXT_SWITCH: {
    label: 'CTX SWITCH',
    row:    'hover:bg-gray-800/50',
    badge:  'bg-gray-600/30 text-gray-400 border border-gray-600/40',
    dot:    'bg-gray-500',
    border: 'border-gray-700',
    text:   'text-gray-400',
  },
  PERMISSION_ERROR: {
    label: 'PERM ERROR',
    row:    'bg-red-900/10 hover:bg-red-900/20',
    badge:  'bg-red-900/40 text-red-400 border border-red-800/50',
    dot:    'bg-red-700',
    border: 'border-red-900',
    text:   'text-red-600',
  },
}

// Estilos compartidos por tipo de paso del stepper.
// Usado en: StepPanel, StepIsland
export const STEP_TYPE_STYLES = {
  hit:    { dot: 'bg-emerald-400', bar: 'bg-emerald-500', text: 'text-emerald-300', active: 'bg-emerald-500/10 border-emerald-500/30', badge: 'bg-emerald-500/15 border-emerald-500/30' },
  miss:   { dot: 'bg-yellow-400',  bar: 'bg-yellow-500',  text: 'text-yellow-300',  active: 'bg-yellow-500/10 border-yellow-500/30',  badge: 'bg-yellow-500/15 border-yellow-500/30'  },
  fault:  { dot: 'bg-red-400',     bar: 'bg-red-500',     text: 'text-red-300',     active: 'bg-red-500/10 border-red-500/30',        badge: 'bg-red-500/15 border-red-500/30'        },
  error:  { dot: 'bg-red-700',     bar: 'bg-red-700',     text: 'text-red-400',     active: 'bg-red-900/20 border-red-800/40',        badge: 'bg-red-900/20 border-red-800/40'        },
  switch: { dot: 'bg-gray-500',    bar: 'bg-gray-500',    text: 'text-gray-400',    active: 'bg-gray-700/30 border-gray-600/40',      badge: 'bg-gray-700/30 border-gray-600/40'      },
  info:   { dot: 'bg-blue-400',    bar: 'bg-blue-500',    text: 'text-blue-300',    active: 'bg-blue-500/10 border-blue-500/30',      badge: 'bg-blue-500/15 border-blue-500/30'      },
}

// Paleta de colores por proceso (por índice en el array processes[]).
// Usado en: PhysicalMemoryView, DiskView
export const PROCESS_COLORS = [
  { border: 'border-blue-500/60',   bg: 'bg-blue-500/10',   text: 'text-blue-300',   dot: 'bg-blue-400'   },
  { border: 'border-violet-500/60', bg: 'bg-violet-500/10', text: 'text-violet-300', dot: 'bg-violet-400' },
  { border: 'border-amber-500/60',  bg: 'bg-amber-500/10',  text: 'text-amber-300',  dot: 'bg-amber-400'  },
  { border: 'border-rose-500/60',   bg: 'bg-rose-500/10',   text: 'text-rose-300',   dot: 'bg-rose-400'   },
  { border: 'border-teal-500/60',   bg: 'bg-teal-500/10',   text: 'text-teal-300',   dot: 'bg-teal-400'   },
  { border: 'border-orange-500/60', bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-400' },
]

// Mapping de subsistema → id del elemento DOM para scroll automático.
// Usado en: App.vue
export const SUBSYSTEM_IDS = {
  tlb:         'section-tlb',
  pagetable:   'section-pagetable',
  ram:         'section-ram',
  disk:        'section-disk',
  instruction: 'section-instruction',
}
