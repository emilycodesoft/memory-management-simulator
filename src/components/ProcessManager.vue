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
      <!-- Nombre del proceso -->
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

      <!-- Lista de segmentos -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs text-gray-400">Segmentos</label>
          <button
            v-if="form.segments.length < 3"
            type="button"
            @click="addSegment"
            class="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >+ Agregar segmento</button>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="(seg, i) in form.segments"
            :key="i"
            class="border border-gray-700 rounded p-1.5 space-y-1"
          >
            <!-- Cabecera del segmento -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-mono text-gray-500 w-5">S{{ i }}</span>
              <input
                v-model="seg.name"
                type="text"
                maxlength="12"
                placeholder="Código"
                class="flex-1 bg-gray-900 text-[10px] px-1.5 py-0.5 rounded border border-gray-700 focus:border-blue-500 outline-none text-gray-200"
              />
              <button
                v-if="form.segments.length > 1"
                type="button"
                @click="removeSegment(i)"
                class="text-gray-600 hover:text-red-400 text-[10px] px-1 transition-colors"
              >✕</button>
            </div>

            <!-- Páginas y permisos -->
            <div class="flex items-center gap-2 pl-6">
              <span class="text-[10px] text-gray-500 shrink-0">Págs</span>
              <input
                type="range" min="1" max="8" step="1"
                v-model.number="seg.pageCount"
                class="flex-1 accent-blue-500"
              />
              <span class="text-[10px] font-mono w-4 text-right text-blue-300">{{ seg.pageCount }}</span>
              <button
                type="button"
                @click="seg.permissions = seg.permissions === 'RW' ? 'R' : 'RW'"
                class="text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ml-1"
                :class="seg.permissions === 'R'
                  ? 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                  : 'bg-blue-900 text-blue-300 hover:bg-blue-800'"
              >{{ seg.permissions }}</button>
            </div>
          </div>
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

        <!-- Chips de segmentos -->
        <div class="flex flex-wrap gap-1">
          <span
            v-for="seg in proc.segmentTable"
            :key="seg.segmentId"
            class="text-[10px] font-mono px-1.5 py-0.5 rounded"
            :class="seg.permissions === 'R'
              ? 'bg-yellow-900 text-yellow-300'
              : 'bg-blue-900 text-blue-300'"
          >
            S{{ seg.segmentId }}:{{ seg.name }} {{ seg.limitPages }}p {{ seg.permissions }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()

const defaultSegments = () => [
  { name: 'Código', pageCount: 2, permissions: 'R'  },
  { name: 'Datos',  pageCount: 2, permissions: 'RW' },
]

const form = ref({
  name: '',
  segments: defaultSegments(),
})

function addSegment() {
  form.value.segments.push({ name: `Seg${form.value.segments.length}`, pageCount: 2, permissions: 'RW' })
}

function removeSegment(i) {
  form.value.segments.splice(i, 1)
}

function handleAdd() {
  if (!form.value.name.trim()) return
  store.addProcess(form.value.name.trim(), form.value.segments.map(s => ({ ...s })))
  form.value.name = ''
  form.value.segments = defaultSegments()
}
</script>
