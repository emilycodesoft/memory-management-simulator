<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'
import { useProcessLabel } from '../composables/useProcessLabel'
import { useSubsystemActive } from '../composables/useSubsystemActive'
const store = useSimulatorStore()
const { physicalMemory, processes, executionLog, tick } = storeToRefs(store)
const { isActive } = useSubsystemActive('ram')
const { processName, processColor } = useProcessLabel()

function isStepTarget(frame) {
  if (!isActive.value) return false
  const s = store.stepper
  const step = s.steps[s.currentIdx]
  if (!step) return false
  if (step.id === 'SELECT_FRAME_FREE') return frame.frameId === s._freeFrame
  if (step.id === 'SELECT_FRAME_VICTIM' || step.id === 'EVICT') return frame.frameId === s._victim
  if (step.id === 'LOAD_PAGE') return frame.frameId === s._pfn
  return false
}

function stepTargetClass(frame) {
  if (!isStepTarget(frame)) return ''
  const step = store.stepper.steps[store.stepper.currentIdx]
  if (!step) return ''
  if (step.id === 'EVICT' || step.id === 'SELECT_FRAME_VICTIM') return 'ring-2 ring-red-400/70 shadow-red-500/30'
  if (step.id === 'LOAD_PAGE') return 'ring-2 ring-emerald-400/70 shadow-emerald-500/30'
  return 'ring-2 ring-blue-400/70 shadow-blue-500/30'
}

// Marco afectado por la última instrucción real (excluye context switch).
const lastAffectedFrame = computed(() => {
  const last = [...executionLog.value]
    .reverse()
    .find(e => e.frameAssigned !== null && e.result !== 'CONTEXT_SWITCH')
  return last?.frameAssigned ?? null
})

function isHighlighted(frame) {
  return tick.value > 0 && frame.frameId === lastAffectedFrame.value
}
</script>

<template>
  <div
    class="bg-gray-900 rounded-xl border overflow-hidden transition-all duration-300"
    :class="isActive ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/20' : 'border-gray-700'"
  >

    <!-- Encabezado -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white tracking-wide">Memoria Física</span>
        <span class="text-xs text-gray-400 font-mono">RAM</span>
      </div>
      <span
        class="text-xs font-mono px-2 py-0.5 rounded-full"
        :class="store.freeFrameCount > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'"
      >
        {{ store.freeFrameCount }} libres / {{ physicalMemory.length }} marcos
      </span>
    </div>

    <!-- Leyenda de procesos -->
    <div
      v-if="processes.length > 0"
      class="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-700/60 bg-gray-800/40"
    >
      <div
        v-for="proc in processes"
        :key="proc.id"
        class="flex items-center gap-1.5"
      >
        <span class="w-2 h-2 rounded-full flex-shrink-0" :class="processColor(proc.id).dot" />
        <span class="text-[10px] text-gray-400 font-mono">{{ proc.name }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
        <span class="text-[10px] text-gray-500 font-mono">Libre</span>
      </div>
    </div>

    <!-- Grilla de marcos -->
    <div class="p-4 grid grid-cols-4 gap-2">
      <div
        v-for="frame in physicalMemory"
        :key="`${frame.frameId}-${store.stepper.animationKey}`"
        class="relative rounded-lg border p-2.5 transition-all duration-300 min-h-[82px] flex flex-col justify-between"
        :class="[
          frame.processId !== null
            ? [processColor(frame.processId).border, processColor(frame.processId).bg]
            : 'border-gray-700/50 bg-gray-800/30',
          isHighlighted(frame)
            ? 'ring-2 ring-white/25 scale-[1.04] shadow-lg shadow-black/40 z-10'
            : '',
          stepTargetClass(frame)
            ? [stepTargetClass(frame), 'scale-[1.04] shadow-lg z-10']
            : '',
        ]"
      >
        <!-- ID del marco + pulso de "último acceso" -->
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-gray-500 font-mono font-medium">F{{ frame.frameId }}</span>
          <span
            v-if="isHighlighted(frame)"
            class="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"
          />
        </div>

        <!-- Proceso + VPN o "libre" -->
        <div class="flex-1 flex flex-col justify-center my-1">
          <template v-if="frame.processId !== null">
            <span
              class="text-[11px] font-semibold font-mono leading-tight"
              :class="processColor(frame.processId).text"
            >
              {{ processName(frame.processId) }}
            </span>
            <span class="text-[10px] text-gray-400 font-mono">VPN {{ frame.vpn }}</span>
          </template>
          <template v-else>
            <span class="text-[10px] text-gray-600 font-mono italic">libre</span>
          </template>
        </div>

        <!-- Dirty bit -->
        <div class="flex items-center gap-1 h-3">
          <template v-if="frame.dirty">
            <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
            <span class="text-[9px] text-yellow-400/80 font-mono">dirty</span>
          </template>
          <template v-else-if="frame.processId !== null">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
            <span class="text-[9px] text-gray-600 font-mono">clean</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Indicador activo -->
    <div
      v-if="isActive"
      class="px-4 py-1.5 bg-emerald-500/10 border-t border-emerald-500/20 text-[10px] text-emerald-400 font-mono flex items-center gap-1.5"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {{ store.stepper.steps[store.stepper.currentIdx]?.label ?? 'RAM activa' }}
    </div>

    <!-- Pie: leyenda dirty bit -->
    <div class="px-4 py-2 border-t border-gray-700/60 bg-gray-800/40">
      <p class="text-[10px] text-gray-600">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1 align-middle" />
        <span class="text-gray-500 font-medium">dirty</span>
        — página modificada en RAM, pendiente de escritura a disco. Se escribe al ser desalojada.
      </p>
    </div>
  </div>
</template>
