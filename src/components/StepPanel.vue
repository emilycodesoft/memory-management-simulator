<script setup>
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'
import { useProcessLabel } from '../composables/useProcessLabel'
import { useStepControls } from '../composables/useStepControls'
import { STEP_TYPE_STYLES } from '../constants'

const store = useSimulatorStore()
const { stepper } = storeToRefs(store)
const { processName } = useProcessLabel()
const { canAdvance, canGoBack, isLastStep } = useStepControls()

function typeStyle(type) {
  return STEP_TYPE_STYLES[type] ?? STEP_TYPE_STYLES.info
}

function stepStatus(idx) {
  if (idx < stepper.value.currentIdx) return 'done'
  if (idx === stepper.value.currentIdx) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="bg-gray-900 rounded-xl border border-blue-800/40 overflow-hidden">

    <!-- Encabezado -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white tracking-wide">Ejecución paso a paso</span>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-gray-500">
        <span>{{ processName(stepper._processId) }}</span>
        <span class="text-gray-700">·</span>
        <span class="text-cyan-400">{{ stepper._virtualAddress }}</span>
        <span
          class="px-1 py-0 rounded text-[10px]"
          :class="stepper._operation === 'W' ? 'bg-orange-500/20 text-orange-300' : 'bg-sky-500/20 text-sky-300'"
        >
          {{ stepper._operation }}
        </span>
      </div>
    </div>

    <!-- Lista de pasos -->
    <div class="divide-y divide-gray-800/60">
      <div
        v-for="(step, idx) in stepper.steps"
        :key="step.id + idx"
        class="flex items-start gap-3 px-4 py-2.5 transition-all duration-200"
        :class="stepStatus(idx) === 'active'
          ? ['border-l-2', typeStyle(step.type).active, `border-l-${typeStyle(step.type).dot.replace('bg-', '')}`]
          : 'border-l-2 border-l-transparent'"
      >
        <!-- Icono de estado -->
        <div class="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
          <template v-if="stepStatus(idx) === 'done'">
            <span class="text-emerald-400 text-xs font-bold">✓</span>
          </template>
          <template v-else-if="stepStatus(idx) === 'active'">
            <span
              class="w-2 h-2 rounded-full animate-pulse"
              :class="typeStyle(step.type).dot"
            />
          </template>
          <template v-else>
            <span class="w-2 h-2 rounded-full bg-gray-700" />
          </template>
        </div>

        <!-- Contenido del paso -->
        <div class="flex-1 min-w-0">
          <p
            class="text-xs font-semibold"
            :class="stepStatus(idx) === 'done'
              ? 'text-gray-500'
              : stepStatus(idx) === 'active'
                ? typeStyle(step.type).text
                : 'text-gray-600'"
          >
            {{ step.label }}
          </p>
          <p
            v-if="stepStatus(idx) !== 'pending'"
            class="text-[11px] leading-snug mt-0.5"
            :class="stepStatus(idx) === 'done' ? 'text-gray-600' : 'text-gray-400'"
          >
            {{ step.detail }}
          </p>
        </div>

        <!-- Número de paso -->
        <span class="shrink-0 text-[10px] font-mono text-gray-700 mt-0.5">{{ idx + 1 }}/{{ stepper.steps.length }}</span>
      </div>
    </div>

    <!-- Botones de control -->
    <div class="px-4 py-3 border-t border-gray-700/60 bg-gray-800/40 flex items-center gap-2">
      <button
        @click="store.prevStep()"
        :disabled="!canGoBack"
        class="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded transition-colors disabled:opacity-30"
        title="Volver al paso anterior"
      >←</button>

      <button
        @click="store.advanceStep()"
        :disabled="!canAdvance"
        class="flex-1 text-xs font-semibold py-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :class="isLastStep
          ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
          : 'bg-blue-700 hover:bg-blue-600 text-white'"
      >
        {{ isLastStep ? 'Finalizar ✓' : 'Siguiente paso →' }}
      </button>

      <button
        @click="store.replayAnimation()"
        :disabled="!stepper.running"
        class="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded transition-colors disabled:opacity-30"
        title="Repetir animación del paso actual"
      >
        ↺
      </button>

      <button
        @click="store.completeAllSteps()"
        :disabled="!canAdvance"
        class="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded transition-colors disabled:opacity-30"
        title="Completar todos los pasos de una vez"
      >
        ⏭ Todo
      </button>
    </div>
  </div>
</template>
