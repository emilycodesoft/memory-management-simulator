<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'
import { useStepControls } from '../composables/useStepControls'
import { STEP_TYPE_STYLES } from '../constants'

const store = useSimulatorStore()
const { stepper } = storeToRefs(store)
const { currentStep, isLastStepStep, canAdvance, canGoBack } = useStepControls()

const total = computed(() => stepper.value.steps.length)
const idx = computed(() => stepper.value.currentIdx)

function style(type) {
  return STEP_TYPE_STYLES[type] ?? STEP_TYPE_STYLES.info
}
</script>

<template>
  <div class="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/80 overflow-hidden">

    <!-- Barra de progreso -->
    <div class="h-0.5 bg-gray-800 relative">
      <div
        class="h-full transition-all duration-300"
        :class="currentStep ? style(currentStep.type).bar : 'bg-gray-700'"
        :style="{ width: total > 0 ? `${(idx / total) * 100}%` : '0%' }"
      />
    </div>

    <!-- Paso actual -->
    <div class="px-4 pt-3 pb-2">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[10px] font-mono text-gray-600">paso {{ idx + 1 }} / {{ total }}</span>
        <span
          v-if="currentStep"
          class="text-[10px] font-mono px-1.5 py-0.5 rounded border"
          :class="style(currentStep.type).badge"
        >
          {{ currentStep.type.toUpperCase() }}
        </span>
      </div>

      <template v-if="currentStep">
        <p class="text-sm font-semibold" :class="style(currentStep.type).text">
          {{ currentStep.label }}
        </p>
        <p class="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
          {{ currentStep.detail }}
        </p>
      </template>
      <p v-else class="text-xs text-gray-500">Instrucción completada.</p>
    </div>

    <!-- Controles -->
    <div class="px-3 pb-3 flex items-center gap-2">
      <button
        @click="store.prevStep()"
        :disabled="!canGoBack"
        title="Volver al paso anterior"
        class="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
      >←</button>

      <button
        @click="store.advanceStep()"
        :disabled="!canAdvance"
        class="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :class="isLastStep
          ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
          : 'bg-blue-700 hover:bg-blue-600 text-white'"
      >
        {{ isLastStep ? 'Finalizar ✓' : 'Siguiente →' }}
      </button>

      <button
        @click="store.replayAnimation()"
        :disabled="!stepper.running"
        title="Repetir animación"
        class="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
      >↺</button>

      <button
        @click="store.completeAllSteps()"
        :disabled="!canAdvance"
        title="Completar todo"
        class="w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
      >⏭</button>
    </div>
  </div>
</template>
