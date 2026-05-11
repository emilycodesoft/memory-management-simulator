<template>
  <div>
    <h2 class="font-semibold text-sm text-gray-300 mb-3">Ejecutar instrucción</h2>

    <p v-if="!store.simulationStarted" class="text-xs text-gray-500">
      Inicia la simulación en el panel de configuración para ejecutar instrucciones.
    </p>

    <p v-else-if="store.processes.length === 0" class="text-xs text-gray-500">
      Crea al menos un proceso para ejecutar instrucciones.
    </p>

    <div v-else class="space-y-2">
      <!-- Selección de proceso -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400 w-16 shrink-0">Proceso</label>
        <select
          v-model="selectedProcessId"
          class="flex-1 bg-gray-800 text-xs px-2 py-1 rounded border border-gray-700 focus:border-blue-500 outline-none text-gray-200"
        >
          <option v-for="proc in store.processes" :key="proc.id" :value="proc.id">
            #{{ proc.id }} {{ proc.name }}
          </option>
        </select>
      </div>

      <!-- Dirección virtual en hex -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400 w-16 shrink-0">Dirección</label>
        <div class="flex-1 relative">
          <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">0x</span>
          <input
            v-model="rawAddress"
            type="text"
            placeholder="3A4F"
            maxlength="6"
            @input="onAddressInput"
            class="w-full bg-gray-800 text-xs pl-7 pr-2 py-1 rounded border outline-none text-gray-200 font-mono uppercase"
            :class="addressError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-blue-500'"
          />
        </div>
      </div>

      <!-- Hint: desglose de la dirección en tiempo real -->
      <div class="pl-[72px] -mt-1 text-[10px] font-mono">
        <p v-if="addressError" class="text-red-400">{{ addressError }}</p>
        <p v-else-if="addressHint" class="text-gray-500">{{ addressHint }}</p>
        <p v-else class="text-gray-600">Hex de hasta 6 dígitos, ej: 3A4F → VPN 3, offset 0xA4F</p>
      </div>

      <!-- Selector de operación -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400 w-16 shrink-0">Operación</label>
        <div class="flex gap-1">
          <button
            v-for="op in ['R', 'W']"
            :key="op"
            type="button"
            @click="operation = op"
            class="text-xs font-mono px-4 py-1 rounded transition-colors"
            :class="operation === op
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
          >
            {{ op === 'R' ? 'Lectura' : 'Escritura' }}
          </button>
        </div>
      </div>

      <!-- Toggle: modo paso a paso -->
      <div class="flex items-center justify-between pt-1">
        <label class="text-xs text-gray-400">Modo paso a paso</label>
        <button
          type="button"
          @click="store.toggleStepper()"
          :disabled="store.stepper.running"
          class="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
          :class="store.stepper.active ? 'bg-blue-600' : 'bg-gray-700'"
          :title="store.stepper.active ? 'Desactivar modo paso a paso' : 'Activar modo paso a paso'"
        >
          <span
            class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
            :class="store.stepper.active ? 'left-5' : 'left-0.5'"
          />
        </button>
      </div>

      <button
        @click="handleExecute"
        :disabled="!!addressError || !rawAddress.trim() || store.stepper.running"
        class="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded transition-colors"
      >
        {{ store.stepper.active ? 'Iniciar paso a paso' : 'Ejecutar instrucción' }}
      </button>
    </div>

    <!-- Resumen del último resultado -->
    <div
      v-if="lastEntry"
      class="mt-3 border rounded p-2 text-[11px] font-mono"
      :class="resultBorderClass"
    >
      <div class="flex items-center justify-between mb-1">
        <span class="font-bold" :class="resultTextClass">{{ resultLabel }}</span>
        <span class="text-gray-500">tick {{ lastEntry.tick }}</span>
      </div>
      <p class="text-gray-300 leading-relaxed">{{ lastEntry.detail }}</p>
      <div v-if="lastEntry.frameAssigned !== null" class="text-gray-500 mt-1 space-x-2">
        <span>VPN <span class="text-gray-300">{{ lastEntry.vpn }}</span></span>
        <span>→</span>
        <span>Marco <span class="text-gray-300">{{ lastEntry.frameAssigned }}</span></span>
        <span>|</span>
        <span>offset <span class="text-gray-300">0x{{ lastEntry.offset?.toString(16).toUpperCase().padStart(3, '0') }}</span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()

const selectedProcessId = ref(store.processes[0]?.id ?? null)
const rawAddress = ref('')
const operation = ref('R')
const addressError = ref('')

// Keep selectedProcessId valid when processes list changes
watch(() => store.processes, (procs) => {
  if (!procs.find(p => p.id === selectedProcessId.value)) {
    selectedProcessId.value = procs[0]?.id ?? null
  }
}, { deep: false })

function validateAddress(hex, process) {
  if (!hex) return 'Ingresa una dirección.'
  const addr = parseInt(hex, 16)
  if (isNaN(addr)) return 'Dirección inválida.'
  const vpn = addr >>> 12
  if (!process) return ''
  if (!process.pageTable.find(p => p.vpn === vpn))
    return `VPN ${vpn} no existe en este proceso (páginas 0–${process.pageTable.length - 1}).`
  return ''
}

function onAddressInput() {
  rawAddress.value = rawAddress.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
  const process = store.processes.find(p => p.id === selectedProcessId.value)
  addressError.value = rawAddress.value ? validateAddress(rawAddress.value, process) : ''
}

function handleExecute() {
  if (addressError.value || !rawAddress.value.trim() || store.stepper.running) return
  store.beginInstruction(selectedProcessId.value, '0x' + rawAddress.value, operation.value)
}

// Muestra el desglose VPN + offset mientras el usuario escribe
const addressHint = computed(() => {
  if (!rawAddress.value || addressError.value) return ''
  const addr = parseInt(rawAddress.value, 16)
  const vpn = addr >>> 12
  const offset = addr & 0xFFF
  return `VPN ${vpn}  |  offset 0x${offset.toString(16).toUpperCase().padStart(3, '0')}`
})

// Último resultado que no sea CONTEXT_SWITCH (para el resumen visual)
const lastEntry = computed(() => {
  for (let i = store.executionLog.length - 1; i >= 0; i--) {
    if (store.executionLog[i].result !== 'CONTEXT_SWITCH') return store.executionLog[i]
  }
  return null
})

const RESULT_CONFIG = {
  TLB_HIT:          { label: 'TLB HIT',       border: 'border-green-700',  text: 'text-green-400' },
  TLB_MISS:         { label: 'TLB MISS',       border: 'border-yellow-600', text: 'text-yellow-400' },
  PAGE_FAULT:       { label: 'PAGE FAULT',     border: 'border-red-700',    text: 'text-red-400' },
  PERMISSION_ERROR: { label: 'ERROR PERMISO',  border: 'border-red-900',    text: 'text-red-600' },
}

const resultBorderClass = computed(() =>
  lastEntry.value ? (RESULT_CONFIG[lastEntry.value.result]?.border ?? 'border-gray-700') + ' bg-gray-800' : ''
)
const resultTextClass = computed(() =>
  lastEntry.value ? RESULT_CONFIG[lastEntry.value.result]?.text ?? 'text-gray-300' : ''
)
const resultLabel = computed(() =>
  lastEntry.value ? RESULT_CONFIG[lastEntry.value.result]?.label ?? lastEntry.value.result : ''
)
</script>
