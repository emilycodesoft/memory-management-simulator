<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-sm text-gray-300">Procesos</h2>
      <span class="text-xs text-gray-500 font-mono">{{ store.processes.length }}/3</span>
    </div>

    <!-- Formulario para agregar proceso -->
    <div
      v-if="!store.simulationStarted && store.processes.length < 3"
      class="space-y-2 mb-4 border border-gray-700 rounded p-2"
    >
      <!-- Nombre -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400 w-16 shrink-0">Nombre</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="Proceso A"
          maxlength="20"
          @keydown.enter="handleAdd"
          class="flex-1 bg-gray-800 text-xs px-2 py-1 rounded border border-gray-700 focus:border-blue-500 outline-none text-gray-200"
        />
      </div>

      <!-- Cantidad de páginas -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-400 w-16 shrink-0">Páginas</label>
        <input
          type="range" min="1" max="8" step="1"
          v-model.number="form.pageCount"
          class="flex-1 accent-blue-500"
        />
        <span class="text-xs font-mono w-4 text-right text-blue-300">{{ form.pageCount }}</span>
      </div>

      <!-- Permisos por página -->
      <div>
        <label class="text-xs text-gray-400 block mb-1">Permisos por página</label>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="(perm, i) in form.pagePermissions"
            :key="i"
            type="button"
            @click="togglePermission(i)"
            class="text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors"
            :class="perm === 'R'
              ? 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
              : 'bg-blue-900 text-blue-300 hover:bg-blue-800'"
          >
            P{{ i }} {{ perm }}
          </button>
        </div>
      </div>

      <button
        @click="handleAdd"
        :disabled="!form.name.trim()"
        class="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded transition-colors"
      >
        + Agregar proceso
      </button>
    </div>

    <!-- Mensaje cuando la simulación está activa y no hay procesos -->
    <p
      v-if="store.simulationStarted && store.processes.length === 0"
      class="text-xs text-gray-500 text-center mt-2"
    >
      Reinicia la simulación para agregar procesos.
    </p>

    <!-- Lista de procesos creados -->
    <div class="space-y-2">
      <div
        v-for="proc in store.processes"
        :key="proc.id"
        class="bg-gray-800 rounded p-2"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold text-gray-200">
            #{{ proc.id }} {{ proc.name }}
          </span>
          <button
            v-if="!store.simulationStarted"
            @click="store.removeProcess(proc.id)"
            title="Eliminar proceso"
            class="text-gray-500 hover:text-red-400 text-xs px-1 transition-colors"
          >✕</button>
        </div>

        <!-- Chips de páginas con permiso -->
        <div class="flex flex-wrap gap-1">
          <span
            v-for="page in proc.pageTable"
            :key="page.vpn"
            class="text-[10px] font-mono px-1.5 py-0.5 rounded"
            :class="page.permissions === 'R'
              ? 'bg-yellow-900 text-yellow-300'
              : 'bg-blue-900 text-blue-300'"
          >
            P{{ page.vpn }} {{ page.permissions }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()

const form = ref({
  name: '',
  pageCount: 3,
  pagePermissions: Array(3).fill('RW'),
})

watch(() => form.value.pageCount, (newCount) => {
  form.value.pagePermissions = Array.from(
    { length: newCount },
    (_, i) => form.value.pagePermissions[i] ?? 'RW',
  )
})

function togglePermission(i) {
  form.value.pagePermissions[i] = form.value.pagePermissions[i] === 'RW' ? 'R' : 'RW'
}

function handleAdd() {
  if (!form.value.name.trim()) return
  store.addProcess(form.value.name.trim(), form.value.pageCount, [...form.value.pagePermissions])
  form.value.name = ''
  form.value.pageCount = 3
  form.value.pagePermissions = Array(3).fill('RW')
}
</script>
