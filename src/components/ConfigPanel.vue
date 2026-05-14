<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-sm text-gray-300">Configuración</h2>
      <span v-if="started" class="text-xs text-green-400 font-mono">● Simulación activa</span>
    </div>

    <fieldset
      :disabled="started"
      class="space-y-3 transition-opacity"
      :class="{ 'opacity-40 pointer-events-none select-none': started }"
    >
      <!-- Marcos físicos -->
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs text-gray-400 w-40">Marcos físicos</label>
        <div class="flex items-center gap-2">
          <input
            type="range" min="4" max="16" step="1"
            v-model.number="local.frameCount"
            class="w-24 accent-blue-500"
          />
          <span class="text-xs font-mono w-5 text-right text-blue-300">{{ local.frameCount }}</span>
        </div>
      </div>

      <!-- Entradas TLB -->
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs text-gray-400 w-40">Entradas TLB</label>
        <div class="flex items-center gap-2">
          <input
            type="range" min="2" max="8" step="1"
            v-model.number="local.tlbSize"
            class="w-24 accent-blue-500"
          />
          <span class="text-xs font-mono w-5 text-right text-blue-300">{{ local.tlbSize }}</span>
        </div>
      </div>

      <!-- Algoritmo de reemplazo -->
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs text-gray-400 w-40">Algoritmo reemplazo</label>
        <div class="flex gap-2">
          <button
            v-for="alg in ['FIFO', 'LRU']"
            :key="alg"
            type="button"
            @click="local.algorithm = alg"
            :class="[
              'text-xs px-3 py-1 rounded font-mono transition-colors',
              local.algorithm === alg
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            ]"
          >{{ alg }}</button>
        </div>
      </div>

      <!-- Penalización TLB miss -->
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs text-gray-400 w-40">Penalización TLB miss</label>
        <div class="flex items-center gap-1">
          <input
            type="number" min="1" max="1000"
            v-model.number="local.tlbMissPenalty"
            class="w-16 bg-gray-800 text-xs text-right px-2 py-1 rounded border border-gray-700 focus:border-blue-500 outline-none text-gray-200"
          />
          <span class="text-xs text-gray-500">ciclos</span>
        </div>
      </div>

      <!-- Penalización page fault -->
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs text-gray-400 w-40">Penalización page fault</label>
        <div class="flex items-center gap-1">
          <input
            type="number" min="1" max="10000"
            v-model.number="local.pageFaultPenalty"
            class="w-16 bg-gray-800 text-xs text-right px-2 py-1 rounded border border-gray-700 focus:border-blue-500 outline-none text-gray-200"
          />
          <span class="text-xs text-gray-500">ciclos</span>
        </div>
      </div>
    </fieldset>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()

const local = ref({
  frameCount: store.config.frameCount,
  tlbSize: store.config.tlbSize,
  algorithm: store.config.algorithm,
  tlbMissPenalty: store.config.tlbMissPenalty,
  pageFaultPenalty: store.config.pageFaultPenalty,
})

const started = computed(() => store.simulationStarted)

// Aplica la config al store en tiempo real mientras no haya iniciado la simulación
watch(local, (val) => {
  store.updateConfig({ ...val })
}, { deep: true })

// Sincronizar local si el store se reinicia
watch(() => store.simulationActive, (active) => {
  if (!active) {
    local.value = {
      frameCount: store.config.frameCount,
      tlbSize: store.config.tlbSize,
      algorithm: store.config.algorithm,
      tlbMissPenalty: store.config.tlbMissPenalty,
      pageFaultPenalty: store.config.pageFaultPenalty,
    }
  }
})
</script>
