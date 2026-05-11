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

    <!-- Botones de acción -->
    <div class="mt-4">
      <button
        v-if="!started"
        @click="startSimulation"
        class="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold py-2 rounded transition-colors"
      >
        Iniciar simulación
      </button>
      <button
        v-else
        @click="reset"
        class="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-2 rounded transition-colors"
      >
        Reiniciar simulación
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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

function startSimulation() {
  store.updateConfig({ ...local.value })
  store.startSimulation()
}

function reset() {
  store.resetSimulator()
  local.value = {
    frameCount: store.config.frameCount,
    tlbSize: store.config.tlbSize,
    algorithm: store.config.algorithm,
    tlbMissPenalty: store.config.tlbMissPenalty,
    pageFaultPenalty: store.config.pageFaultPenalty,
  }
}
</script>
