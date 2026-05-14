import { computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator'

export function useSubsystemActive(subsystemName) {
  const store = useSimulatorStore()
  const isActive = computed(() => store.activeSubsystem === subsystemName)
  return { isActive }
}
