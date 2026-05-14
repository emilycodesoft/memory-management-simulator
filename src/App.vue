<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-4 font-mono">
    <h1 class="text-center text-2xl font-bold mb-6 text-blue-400">
      Simulador de Gestión de Memoria — SO
    </h1>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
      
      <!-- Columna Izquierda: Nivel de Aplicación y Métricas -->
      <div class="lg:col-span-4 flex flex-col gap-4">
        
        <!-- Nivel de Aplicación (Software) -->
        <section class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
          <header class="mb-3 border-b border-gray-700 pb-2">
            <h2 class="text-gray-300 font-bold uppercase text-sm flex items-center gap-2">
              💻 Nivel de Aplicación / OS
            </h2>
          </header>
          <div class="flex flex-col gap-4">
            <ConfigPanel class="bg-gray-900 rounded p-3" />
            <ProcessManager class="bg-gray-900 rounded p-3" />

            <!-- Botón de inicio/reset — aquí porque depende de config Y procesos -->
            <div class="bg-gray-900 rounded p-3">
              <button
                v-if="!store.simulationStarted"
                @click="store.startSimulation()"
                :disabled="store.processes.length === 0"
                class="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded transition-colors"
              >
                Iniciar simulación
              </button>
              <button
                v-else
                @click="store.resetSimulator()"
                class="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-2 rounded transition-colors"
              >
                Reiniciar simulación
              </button>
            </div>

            <div id="section-instruction">
              <InstructionInput class="bg-gray-900 rounded p-3" />
              <StepPanel v-if="store.stepper.running" class="bg-gray-900 rounded p-3 border border-blue-800/50 mt-4" />
            </div>
          </div>
        </section>

        <!-- Métricas y Resultados -->
        <section class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
          <header class="mb-3 border-b border-gray-700 pb-2">
            <h2 class="text-gray-300 font-bold uppercase text-sm flex items-center gap-2">
              📊 Métricas de Rendimiento
            </h2>
          </header>
          <MetricsPanel class="bg-gray-900 rounded p-3" />
        </section>
      </div>
      
      <!-- Columna Derecha: Nivel de Hardware -->
      <div class="lg:col-span-8 flex flex-col gap-4">
        
        <!-- Hardware -->
        <section class="bg-blue-900/20 p-4 rounded-lg border border-blue-900/50 shadow-md h-full flex flex-col gap-4">
          <header class="mb-1 border-b border-blue-800/50 pb-2">
            <h2 class="text-blue-400 font-bold uppercase text-sm flex items-center gap-2">
              ⚙️ Nivel de Hardware
            </h2>
          </header>
          
          <!-- CPU / MMU -->
          <div id="section-tlb" class="bg-gray-800 p-4 rounded-lg border border-violet-900/50 shadow-inner">
             <h3 class="text-violet-400 font-bold mb-3 text-sm flex items-center gap-2">
               🧠 CPU / MMU (Memory Management Unit)
             </h3>
             <TLBView class="bg-gray-900 rounded p-3 border border-gray-700" />
          </div>

          <!-- Memoria Física (RAM) -->
          <div class="bg-gray-800 p-4 rounded-lg border border-emerald-900/50 shadow-inner flex-grow">
             <h3 class="text-emerald-400 font-bold mb-3 text-sm flex items-center gap-2">
               🖥️ Memoria Principal (RAM Física)
             </h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div id="section-pagetable">
                 <p class="text-xs text-gray-500 mb-1 ml-1">Estructuras del SO en RAM:</p>
                 <PageTableView class="bg-gray-900 rounded p-3 border border-gray-700 h-full" />
               </div>
               <div id="section-ram">
                 <p class="text-xs text-gray-500 mb-1 ml-1">Arreglo de Marcos (Frames):</p>
                 <PhysicalMemoryView class="bg-gray-900 rounded p-3 border border-gray-700 h-full" />
               </div>
             </div>
          </div>

          <!-- Almacenamiento Secundario (Disco) -->
          <div id="section-disk" class="bg-gray-800 p-4 rounded-lg border border-orange-900/50 shadow-inner">
            <h3 class="text-orange-400 font-bold mb-3 text-sm flex items-center gap-2">
              💾 Almacenamiento Secundario (Disco / Swap)
            </h3>
            <DiskView />
          </div>

        </section>
      </div>
    
    </div>

    <!-- Log de Ejecución -->
    <section class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md mt-4">
      <header class="mb-3 border-b border-gray-700 pb-2">
        <h2 class="text-gray-300 font-bold uppercase text-sm flex items-center gap-2">
          📝 Historial de Instrucciones (Trazabilidad)
        </h2>
      </header>
      <ExecutionLog class="bg-gray-900 rounded p-3" />
    </section>

  </div>

  <!-- Panel flotante paso a paso -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="store.stepper.running"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 w-96 z-50 rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10"
      >
        <StepIsland />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch } from 'vue'
import { useSimulatorStore } from './stores/simulator'
import { SUBSYSTEM_IDS } from './constants'

const store = useSimulatorStore()

import ConfigPanel from './components/ConfigPanel.vue'
import ProcessManager from './components/ProcessManager.vue'
import InstructionInput from './components/InstructionInput.vue'
import MetricsPanel from './components/MetricsPanel.vue'
import PhysicalMemoryView from './components/PhysicalMemoryView.vue'
import PageTableView from './components/PageTableView.vue'
import TLBView from './components/TLBView.vue'
import ExecutionLog from './components/ExecutionLog.vue'
import DiskView from './components/DiskView.vue'
import StepPanel from './components/StepPanel.vue'
import StepIsland from './components/StepIsland.vue'

watch(() => store.activeSubsystem, (subsystem) => {
  if (!subsystem) return
  const id = SUBSYSTEM_IDS[subsystem]
  if (id) {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }
})

// Al finalizar el stepper (running: true → false), volver al panel de instrucciones
watch(() => store.stepper.running, (running, wasRunning) => {
  if (wasRunning && !running) {
    setTimeout(() => {
      document.getElementById('section-instruction')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }
})
</script>
