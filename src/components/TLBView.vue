<template>
  <div>
    <h2 class="font-semibold text-sm mb-2">TLB</h2>
    <!-- TODO: tabla con entradas del TLB, destacar hits/misses -->
  </div>
</template>

<script setup>
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()
</script>
