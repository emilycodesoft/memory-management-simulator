import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'

export function useStepControls() {
  const store = useSimulatorStore()
  const { stepper } = storeToRefs(store)

  const currentStep = computed(() => stepper.value.steps[stepper.value.currentIdx] ?? null)
  const isLastStep  = computed(() => stepper.value.currentIdx === stepper.value.steps.length - 1)
  const canAdvance  = computed(() => stepper.value.running)
  const canGoBack   = computed(() => stepper.value.running && stepper.value.currentIdx > 0)

  return { currentStep, isLastStep, canAdvance, canGoBack }
}
