<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()
const { processes, executionLog, tick } = storeToRefs(store)

const isActive = computed(() => store.activeSubsystem === 'pagetable')

function isStepVpn(vpn) {
  return isActive.value
    && store.stepper._vpn === vpn
    && store.stepper._processId === selectedProcessId.value
}

const selectedProcessId = ref(processes.value[0]?.id ?? null)

// Mantener selectedProcessId válido cuando la lista de procesos cambia.
watch(processes, (procs) => {
  if (!procs.find(p => p.id === selectedProcessId.value)) {
    selectedProcessId.value = procs[0]?.id ?? null
  }
}, { deep: false })

// Sincronización automática: seguir al proceso de la instrucción activa.
// En modo stepper: _processId desde el inicio del paso.
// En modo normal: último proceso en el log (excluye CONTEXT_SWITCH).
const activeInstructionProcess = computed(() => {
  if (store.stepper.running && store.stepper._processId !== null) {
    return store.stepper._processId
  }
  for (let i = executionLog.value.length - 1; i >= 0; i--) {
    if (executionLog.value[i].result !== 'CONTEXT_SWITCH') {
      return executionLog.value[i].processId
    }
  }
  return null
})

watch(activeInstructionProcess, (newId) => {
  if (newId !== null && processes.value.find(p => p.id === newId)) {
    selectedProcessId.value = newId
  }
})

const selectedProcess = computed(() =>
  processes.value.find(p => p.id === selectedProcessId.value) ?? null,
)

// VPN destacada: la que fue accedida en la última instrucción del proceso visible.
const lastAccessedVpn = computed(() => {
  if (!selectedProcess.value || executionLog.value.length === 0) return null
  const last = [...executionLog.value]
    .reverse()
    .find(e => e.processId === selectedProcessId.value && e.result !== 'CONTEXT_SWITCH' && e.vpn !== null)
  return last?.vpn ?? null
})

function rowClass(entry) {
  if (!entry.valid)  return 'bg-red-500/8 hover:bg-red-500/12 border-l-2 border-red-500/40'
  if (entry.dirty)   return 'bg-yellow-500/8 hover:bg-yellow-500/12 border-l-2 border-yellow-500/40'
  return 'hover:bg-gray-800/40 border-l-2 border-transparent'
}

function isLastAccessed(vpn) {
  return tick.value > 0 && vpn === lastAccessedVpn.value
}
</script>

<template>
  <div
    class="bg-gray-900 rounded-xl border overflow-hidden transition-all duration-300"
    :class="isActive ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/20' : 'border-gray-700'"
  >

    <!-- Encabezado con selector de proceso -->
    <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-700 bg-gray-800">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-semibold text-white tracking-wide shrink-0">Tabla de Páginas</span>
      </div>

      <select
        v-if="processes.length > 0"
        v-model="selectedProcessId"
        class="bg-gray-700 text-xs text-gray-200 px-2 py-1 rounded border border-gray-600
               focus:border-blue-500 outline-none font-mono max-w-[140px] truncate"
      >
        <option v-for="proc in processes" :key="proc.id" :value="proc.id">
          {{ proc.name }}
        </option>
      </select>
    </div>

    <!-- Sin procesos -->
    <div
      v-if="processes.length === 0"
      class="flex flex-col items-center justify-center py-10 px-4 text-center gap-3"
    >
      <div class="text-3xl opacity-25">📋</div>
      <p class="text-sm font-medium text-gray-400">Sin procesos</p>
      <p class="text-xs text-gray-600 max-w-xs">
        Crea al menos un proceso para ver su tabla de páginas.
      </p>
    </div>

    <!-- Tabla -->
    <div v-else-if="selectedProcess" class="overflow-x-auto">
      <table class="w-full text-xs font-mono">
        <thead>
          <tr class="text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-700/60 bg-gray-800/40">
            <th class="px-3 py-2 text-left font-medium">VPN</th>
            <th class="px-3 py-2 text-left font-medium">Marco (PFN)</th>
            <th class="px-3 py-2 text-center font-medium">Valid</th>
            <th class="px-3 py-2 text-center font-medium">Permisos</th>
            <th class="px-3 py-2 text-center font-medium">Dirty</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in selectedProcess.pageTable"
            :key="`${entry.vpn}-${store.stepper.animationKey}`"
            class="border-b border-gray-800/60 transition-colors duration-150"
            :class="[
              rowClass(entry),
              isLastAccessed(entry.vpn) ? 'outline outline-1 outline-indigo-500/40' : '',
              isStepVpn(entry.vpn) ? 'outline outline-2 outline-cyan-400/60 bg-cyan-500/5' : '',
            ]"
          >
            <!-- VPN -->
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-1.5">
                <span
                  class="font-semibold"
                  :class="isLastAccessed(entry.vpn) ? 'text-indigo-300' : 'text-gray-300'"
                >
                  {{ entry.vpn }}
                </span>
                <span
                  v-if="isLastAccessed(entry.vpn)"
                  class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"
                />
              </div>
            </td>

            <!-- PFN -->
            <td class="px-3 py-2.5">
              <span
                v-if="entry.valid && entry.pfn !== null"
                class="text-emerald-400"
              >
                {{ entry.pfn }}
              </span>
              <span v-else class="text-gray-600">—</span>
            </td>

            <!-- Valid -->
            <td class="px-3 py-2.5 text-center">
              <span v-if="entry.valid" title="En RAM">
                <span class="text-emerald-400 text-sm leading-none">✓</span>
              </span>
              <span v-else title="No en RAM (en disco)">
                <span class="text-red-400/70 text-sm leading-none">✗</span>
              </span>
            </td>

            <!-- Permisos -->
            <td class="px-3 py-2.5 text-center">
              <span
                class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide"
                :class="entry.permissions === 'RW'
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                  : 'bg-gray-600/30 text-gray-400 border border-gray-600/40'"
              >
                {{ entry.permissions }}
              </span>
            </td>

            <!-- Dirty -->
            <td class="px-3 py-2.5 text-center">
              <span
                v-if="entry.dirty"
                class="inline-flex items-center gap-1"
                title="Modificada, pendiente de escritura a disco"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              </span>
              <span v-else class="text-gray-700">·</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Indicador activo -->
    <div
      v-if="isActive"
      class="px-4 py-1.5 bg-cyan-500/10 border-t border-cyan-500/20 text-[10px] text-cyan-400 font-mono flex items-center gap-1.5"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
      Consultando tabla de páginas — VPN {{ store.stepper._vpn }}
    </div>

    <!-- Pie: leyenda de estados -->
    <div class="px-4 py-2 border-t border-gray-700/60 bg-gray-800/40 flex flex-wrap gap-x-4 gap-y-1">
      <span class="text-[10px] text-gray-600 flex items-center gap-1">
        <span class="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/20 border border-red-500/40" />
        No en RAM
      </span>
      <span class="text-[10px] text-gray-600 flex items-center gap-1">
        <span class="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500/20 border border-yellow-500/40" />
        Modificada (dirty)
      </span>
      <span class="text-[10px] text-gray-600 flex items-center gap-1">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
        Último acceso
      </span>
    </div>
  </div>
</template>
