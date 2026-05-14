<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'
import { useProcessLabel } from '../composables/useProcessLabel'
import { RESULT_CONFIG } from '../constants'

const store = useSimulatorStore()
const { executionLog } = storeToRefs(store)
const { processName } = useProcessLabel()

const reversedLog = computed(() => [...executionLog.value].reverse())

function cfg(result) {
  return RESULT_CONFIG[result] ?? RESULT_CONFIG.CONTEXT_SWITCH
}
</script>

<template>
  <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
    <!-- Encabezado -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white tracking-wide">Log de Ejecución</span>
        <span class="text-xs text-gray-400 font-mono">paso a paso</span>
      </div>
      <span
        class="text-xs font-mono px-2 py-0.5 rounded-full"
        :class="executionLog.length > 0
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'bg-gray-700 text-gray-500'"
      >
        {{ executionLog.length }} instrucciones
      </span>
    </div>

    <!-- Estado vacío -->
    <div
      v-if="executionLog.length === 0"
      class="flex flex-col items-center justify-center py-10 px-4 text-center gap-3"
    >
      <div class="text-3xl opacity-30">📋</div>
      <p class="text-sm font-medium text-gray-400">Sin instrucciones ejecutadas</p>
      <p class="text-xs text-gray-600 max-w-xs">
        Cada instrucción que ejecutes aparecerá aquí con su resultado y detalle de la traducción.
      </p>
    </div>

    <!-- Lista con scroll — más reciente arriba -->
    <div v-else class="overflow-y-auto max-h-72 divide-y divide-gray-800/60">
      <div
        v-for="(entry, i) in reversedLog"
        :key="i"
        class="flex items-start gap-3 px-4 py-2.5 transition-colors duration-150"
        :class="cfg(entry.result).row"
      >
        <!-- Tick -->
        <span class="shrink-0 text-[10px] font-mono text-gray-600 w-10 pt-0.5 text-right">
          t{{ entry.tick }}
        </span>

        <!-- Dot de color -->
        <span
          class="shrink-0 mt-1.5 w-2 h-2 rounded-full"
          :class="cfg(entry.result).dot"
        />

        <!-- Cuerpo -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-1.5 mb-0.5">
            <!-- Proceso -->
            <span class="text-xs font-medium text-gray-300">
              {{ processName(entry.processId) }}
            </span>

            <!-- Separador -->
            <span class="text-gray-700 text-xs">·</span>

            <!-- Dirección virtual -->
            <span class="text-xs font-mono text-cyan-400">
              {{ entry.virtualAddress }}
            </span>

            <!-- Operación R/W -->
            <span
              class="text-[10px] font-mono px-1 py-0 rounded"
              :class="entry.operation === 'W'
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-sky-500/20 text-sky-300'"
            >
              {{ entry.operation }}
            </span>

            <!-- Resultado -->
            <span
              class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded tracking-wide"
              :class="cfg(entry.result).badge"
            >
              {{ cfg(entry.result).label }}
            </span>

            <!-- Badge TLB MISS implícito en PAGE_FAULT -->
            <span
              v-if="entry.result === 'PAGE_FAULT' && entry.tlbMiss"
              class="text-[9px] font-mono px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400"
            >
              TLB MISS
            </span>

            <!-- Sub-badge swap-in / carga inicial (solo en PAGE_FAULT) -->
            <span
              v-if="entry.result === 'PAGE_FAULT' && entry.swapIn !== undefined"
              class="text-[9px] font-mono px-1 py-0.5 rounded"
              :class="entry.swapIn ? 'bg-sky-500/15 text-sky-400' : 'bg-gray-600/20 text-gray-500'"
            >
              {{ entry.swapIn ? 'swap-in' : 'inicial' }}
            </span>

            <!-- Badge swap-out cuando hubo desalojo de víctima -->
            <span
              v-if="entry.result === 'PAGE_FAULT' && entry.swapOut"
              class="text-[9px] font-mono px-1 py-0.5 rounded bg-orange-500/15 text-orange-400"
            >
              swap-out
            </span>

            <!-- Marco asignado (si aplica) -->
            <span
              v-if="entry.frameAssigned !== null && entry.frameAssigned !== undefined"
              class="text-[10px] font-mono text-gray-500"
            >
              → marco {{ entry.frameAssigned }}
            </span>

            <!-- Víctima desalojada (si hubo reemplazo) -->
            <span
              v-if="entry.victimVpn !== null && entry.victimVpn !== undefined"
              class="text-[10px] font-mono text-red-500/70"
            >
              (desalojó VPN {{ entry.victimVpn }})
            </span>
          </div>

          <!-- Detalle textual -->
          <p class="text-[11px] text-gray-500 leading-snug truncate" :title="entry.detail">
            {{ entry.detail }}
          </p>
        </div>
      </div>
    </div>

    <!-- Leyenda de colores -->
    <div class="px-4 py-2 border-t border-gray-700/60 bg-gray-800/40 shrink-0">
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <span
          v-for="(c, key) in RESULT_CONFIG"
          :key="key"
          class="flex items-center gap-1 text-[10px]"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="c.dot" />
          <span class="text-gray-600">{{ c.label }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
