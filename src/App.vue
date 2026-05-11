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
            <InstructionInput class="bg-gray-900 rounded p-3" />
            <StepPanel v-if="store.stepper.running" class="mt-0" />
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
          <div class="bg-gray-800 p-4 rounded-lg border border-violet-900/50 shadow-inner">
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
               <div>
                 <p class="text-xs text-gray-500 mb-1 ml-1">Estructuras del SO en RAM:</p>
                 <PageTableView class="bg-gray-900 rounded p-3 border border-gray-700 h-full" />
               </div>
               <div>
                 <p class="text-xs text-gray-500 mb-1 ml-1">Arreglo de Marcos (Frames):</p>
                 <PhysicalMemoryView class="bg-gray-900 rounded p-3 border border-gray-700 h-full" />
               </div>
             </div>
          </div>

          <!-- Almacenamiento Secundario (Disco) -->
          <div class="bg-gray-800 p-4 rounded-lg border border-orange-900/50 shadow-inner">
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
</template>

<script setup>
import { useSimulatorStore } from './stores/simulator'
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
</script>
