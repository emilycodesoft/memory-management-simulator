import { useSimulatorStore } from '../stores/simulator'
import { PROCESS_COLORS } from '../constants'

export function useProcessLabel() {
  const store = useSimulatorStore()

  function processName(processId) {
    return store.processes.find(p => p.id === processId)?.name ?? `P${processId}`
  }

  function processColor(processId) {
    const idx = store.processes.findIndex(p => p.id === processId)
    return PROCESS_COLORS[idx % PROCESS_COLORS.length] ?? PROCESS_COLORS[0]
  }

  return { processName, processColor }
}
