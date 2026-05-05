<template>
  <div>
    <h2 class="font-semibold text-sm mb-2">Métricas</h2>
    <!-- TODO: contadores en tiempo real: hits, misses, faults, hit rate -->
  </div>
</template>

<script setup>
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()
</script>
