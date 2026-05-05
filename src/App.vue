<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-4 font-mono">
    <h1 class="text-center text-xl font-bold mb-4 text-blue-400">
      Simulador de Gestión de Memoria — SO
    </h1>

    <!-- Fila 1: Config + ProcessManager -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <ConfigPanel class="bg-gray-900 rounded p-3" />
      <ProcessManager class="bg-gray-900 rounded p-3" />
    </div>

    <!-- Fila 2: InstructionInput + MetricsPanel -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <InstructionInput class="bg-gray-900 rounded p-3" />
      <MetricsPanel class="bg-gray-900 rounded p-3" />
    </div>

    <!-- Fila 3: PhysicalMemory + PageTable + TLBView -->
    <div class="grid grid-cols-3 gap-3 mb-3">
      <PhysicalMemoryView class="bg-gray-900 rounded p-3" />
      <PageTableView class="bg-gray-900 rounded p-3" />
      <TLBView class="bg-gray-900 rounded p-3" />
    </div>

    <!-- Fila 4: ExecutionLog -->
    <ExecutionLog class="bg-gray-900 rounded p-3" />
  </div>
</template>

<script setup>
import ConfigPanel from './components/ConfigPanel.vue'
import ProcessManager from './components/ProcessManager.vue'
import InstructionInput from './components/InstructionInput.vue'
import MetricsPanel from './components/MetricsPanel.vue'
import PhysicalMemoryView from './components/PhysicalMemoryView.vue'
import PageTableView from './components/PageTableView.vue'
import TLBView from './components/TLBView.vue'
import ExecutionLog from './components/ExecutionLog.vue'
</script>
