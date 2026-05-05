<template>
  <div>
    <h2 class="font-semibold text-sm mb-2">Configuración</h2>
    <!-- TODO: frames, tamaño TLB, algoritmo (FIFO/LRU), penalizaciones -->
  </div>
</template>

<script setup>
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()
</script>
