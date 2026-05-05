<template>
  <div>
    <h2 class="font-semibold text-sm mb-2">Log de Ejecución</h2>
    <!-- TODO: historial paso a paso con colores por tipo de resultado -->
    <!-- Verde: TLB_HIT | Amarillo: TLB_MISS | Rojo: PAGE_FAULT | Gris: CONTEXT_SWITCH | Rojo oscuro: PERMISSION_ERROR -->
  </div>
</template>

<script setup>
import { useSimulatorStore } from '../stores/simulator'

const store = useSimulatorStore()
</script>
