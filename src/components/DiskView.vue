<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'
import { useProcessLabel } from '../composables/useProcessLabel'
import { useSubsystemActive } from '../composables/useSubsystemActive'
const store = useSimulatorStore()
const { disk, processes } = storeToRefs(store)
const { isActive } = useSubsystemActive('disk')
const { processName, processColor } = useProcessLabel()

const sortedDisk = computed(() =>
  [...disk.value].sort((a, b) => b.evictedAt - a.evictedAt),
)

const latestEvictedAt = computed(() =>
  disk.value.length > 0 ? Math.max(...disk.value.map(e => e.evictedAt)) : -1,
)

function isLatest(entry) {
  return disk.value.length > 0 && entry.evictedAt === latestEvictedAt.value
}

</script>

<template>
  <div
    class="bg-gray-900 rounded-xl border overflow-hidden transition-all duration-300"
    :class="isActive ? 'border-orange-400/60 shadow-lg shadow-orange-500/20' : 'border-gray-700'"
  >

    <!-- Encabezado -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white tracking-wide">Disco</span>
        <span class="text-xs text-gray-400 font-mono">swap / almacenamiento secundario</span>
      </div>
      <span
        class="text-xs font-mono px-2 py-0.5 rounded-full"
        :class="disk.length > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-700 text-gray-500'"
      >
        {{ disk.length }} página{{ disk.length !== 1 ? 's' : '' }} en disco
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
    </div>

    <!-- Estado vacío -->
    <div
      v-if="disk.length === 0"
      class="flex flex-col items-center justify-center py-10 px-4 text-center gap-3"
    >
      <div class="text-3xl opacity-30">💾</div>
      <p class="text-sm font-medium text-gray-400">Disco vacío</p>
      <p class="text-xs text-gray-600 max-w-xs">
        Las páginas desalojadas de RAM aparecerán aquí. Las páginas sucias (dirty) requieren escritura a disco al ser expulsadas.
      </p>
    </div>

    <!-- Grilla de páginas en disco -->
    <div v-else class="p-4 grid grid-cols-4 gap-2">
      <div
        v-for="entry in sortedDisk"
        :key="`${entry.processId}-${entry.vpn}-${store.stepper.animationKey}`"
        class="relative rounded-lg border p-2.5 transition-all duration-300 min-h-[82px] flex flex-col justify-between"
        :class="[
          processColor(entry.processId).border,
          processColor(entry.processId).bg,
          isLatest(entry) ? 'ring-2 ring-white/25 scale-[1.04] shadow-lg shadow-black/40 z-10' : '',
          isActive && store.stepper._isSwapIn
            && entry.processId === store.stepper._processId
            && entry.vpn === store.stepper._vpn
            ? 'ring-2 ring-sky-400/70 scale-[1.04] shadow-sky-500/20 z-10'
            : '',
        ]"
      >
        <!-- Origen (inicial o tick de desalojo) + pulso -->
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-gray-500 font-mono font-medium">
            {{ entry.initial ? 'init' : `t${entry.evictedAt}` }}
          </span>
          <span
            v-if="isLatest(entry)"
            class="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"
          />
        </div>

        <!-- Proceso + VPN -->
        <div class="flex-1 flex flex-col justify-center my-1">
          <span
            class="text-[11px] font-semibold font-mono leading-tight"
            :class="processColor(entry.processId).text"
          >
            {{ processName(entry.processId) }}
          </span>
          <span class="text-[10px] text-gray-400 font-mono">VPN {{ entry.vpn }}</span>
        </div>

        <!-- Estado dirty al momento de desalojo -->
        <div class="flex items-center gap-1 h-3">
          <template v-if="entry.dirty">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            <span class="text-[9px] text-amber-400/80 font-mono">escrita</span>
          </template>
          <template v-else>
            <span class="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
            <span class="text-[9px] text-gray-600 font-mono">limpia</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Indicador activo -->
    <div
      v-if="isActive"
      class="px-4 py-1.5 bg-orange-500/10 border-t border-orange-500/20 text-[10px] text-orange-400 font-mono flex items-center gap-1.5"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
      {{ store.stepper._isSwapIn ? 'VPN encontrada en disco → swap-in' : 'Verificando disco...' }}
    </div>

    <!-- Pie: leyenda dirty bit en disco -->
    <div class="px-4 py-2 border-t border-gray-700/60 bg-gray-800/40">
      <p class="text-[10px] text-gray-600">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1 align-middle" />
        <span class="text-gray-500 font-medium">escrita</span>
        — requirió I/O de escritura al ser desalojada (estaba dirty en RAM).
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-600 mr-1 ml-3 align-middle" />
        <span class="text-gray-500 font-medium">limpia</span>
        — desalojada sin escritura (página sin modificar).
      </p>
    </div>
  </div>
</template>
