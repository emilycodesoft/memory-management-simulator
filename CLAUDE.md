# Simulador de Gestión de Memoria con Paginación y TLB

## Contexto del proyecto

Proyecto final de la materia **Sistemas Operativos** (ingeniería de sistemas, Universidad Tecnológica de Pereira). Es una herramienta web interactiva que simula la gestión de memoria de un sistema operativo, incluyendo paginación, algoritmos de reemplazo de páginas, manejo de page faults y una simulación del TLB (Translation Lookaside Buffer) como ítem adicional propuesto por el equipo.

El simulador es **educativo y visual**: el usuario ejecuta instrucciones de memoria paso a paso y observa en tiempo real cómo cambia el estado del sistema (RAM física, tabla de páginas, TLB, métricas).

---

## Stack tecnológico

- **Framework:** Vue 3 (Composition API)
- **Estado global:** Pinia
- **Estilos:** Tailwind CSS
- **Sin Vue Router** — single page application, todo en una pantalla

---

## Requisitos funcionales

### Del profesor
1. Visualizar la asignación de memoria física ante peticiones de procesos
2. Implementar algoritmos de reemplazo de páginas: **LRU** y **FIFO** (configurable)
3. Simular el manejo de page faults mediante una interrupción de software simulada
4. Tabla de permisos básica por página (R/W), verificando el acceso en cada instrucción

### Ítem adicional (propuesto por el equipo)
5. Simulación del **TLB** con métricas de hit rate, miss rate y penalización por miss

---

## Arquitectura

### Estado global — Pinia store (`simulatorStore`)

```js
{
  // Configuración inicial (editable antes de iniciar simulación)
  config: {
    frameCount: Number,      // marcos físicos disponibles (default: 8)
    tlbSize: Number,         // entradas máximas del TLB (default: 4)
    algorithm: 'FIFO'|'LRU', // algoritmo de reemplazo de páginas
    pageFaultPenalty: Number, // ciclos de penalización por page fault (default: 100)
    tlbMissPenalty: Number,  // ciclos extra por TLB miss (default: 10)
  },

  // Memoria física — array de marcos
  physicalMemory: [
    {
      frameId: Number,
      processId: Number | null,  // null = libre
      vpn: Number | null,        // qué página virtual contiene
      dirty: Boolean,
      loadedAt: Number,          // timestamp/tick para FIFO
      lastAccessed: Number,      // timestamp/tick para LRU
    }
  ],

  // Procesos activos
  processes: [
    {
      id: Number,
      name: String,              // ej. "Proceso A"
      pageTable: [
        {
          vpn: Number,           // número de página virtual
          pfn: Number | null,    // número de marco físico (null si no está en RAM)
          valid: Boolean,        // true = está en RAM
          permissions: 'R'|'RW', // permisos de la página
          dirty: Boolean,
        }
      ]
    }
  ],

  // TLB — caché de traducciones recientes
  tlb: [
    {
      vpn: Number,
      pfn: Number,
      processId: Number,
      lastAccessed: Number,      // tick del último acceso (para LRU del TLB)
    }
  ],

  // Proceso activo en este momento
  currentProcessId: Number | null,

  // Métricas acumuladas
  metrics: {
    tlbHits: Number,
    tlbMisses: Number,
    pageFaults: Number,
    totalAccesses: Number,
    hitRate: Number,             // calculado: tlbHits / totalAccesses * 100
  },

  // Log de ejecución — una entrada por instrucción ejecutada
  executionLog: [
    {
      tick: Number,
      processId: Number,
      virtualAddress: String,    // ej. "0x3A4F"
      operation: 'R'|'W',
      vpn: Number,
      offset: Number,
      result: 'TLB_HIT'|'TLB_MISS'|'PAGE_FAULT'|'PERMISSION_ERROR'|'CONTEXT_SWITCH',
      frameAssigned: Number | null,
      victimVpn: Number | null,  // página reemplazada (si hubo reemplazo)
      detail: String,            // descripción en texto del paso
    }
  ],

  // Tick del sistema (incrementa con cada instrucción)
  tick: Number,
}
```

### Acciones del store

```
executeInstruction(processId, virtualAddress, operation)
  → toda la lógica de simulación vive aquí

resetSimulator()
  → limpia estado y métricas

addProcess(name, pageCount, permissions)
  → crea proceso con tabla de páginas inicial

removeProcess(processId)

updateConfig(config)
  → solo disponible antes de iniciar simulación
```

### Lógica de `executeInstruction` — orden exacto

```
1. Si processId !== currentProcessId:
   → registrar CONTEXT_SWITCH en log
   → vaciar TLB (flush completo)
   → currentProcessId = processId

2. Parsear virtualAddress → vpn + offset
   (con páginas de 4KB: offset = últimos 12 bits, vpn = resto)

3. Verificar permisos:
   → buscar vpn en pageTable del proceso
   → si operation='W' y permissions='R': registrar PERMISSION_ERROR, detener

4. Buscar vpn en TLB (filtrado por processId):
   → HIT: metrics.tlbHits++, obtener pfn, ir al paso 7
   → MISS: metrics.tlbMisses++, ir al paso 5

5. Buscar en pageTable:
   → valid=true: cargar traducción en TLB (reemplazar si TLB lleno usando LRU), ir al paso 7
   → valid=false: PAGE FAULT → ir al paso 6

6. Resolver PAGE FAULT:
   a. metrics.pageFaults++
   b. ¿Hay marco libre en physicalMemory?
      → Sí: asignar ese marco
      → No: elegir víctima según config.algorithm
           FIFO: el de menor loadedAt
           LRU:  el de menor lastAccessed
        → si víctima.dirty: simular escritura a disco (log entry)
        → liberar marco de la víctima
        → actualizar pageTable de la víctima (valid=false, pfn=null)
   c. Asignar marco a la nueva página
   d. Actualizar pageTable del proceso (valid=true, pfn=marco, dirty=false)
   e. Cargar traducción en TLB

7. Actualizar lastAccessed del marco (tick actual)
8. Si operation='W': marcar dirty=true en pageTable y physicalMemory
9. Registrar en executionLog con todos los detalles
10. tick++
11. Recalcular metrics.hitRate
```

---

## Componentes

### División de trabajo

**Módulo A — Lógica central (Emily)**
Responsable de la lógica del simulador y los componentes de visualización de estado interno:

| Archivo | Responsabilidad |
|---------|----------------|
| `stores/simulator.js` | Store Pinia completo con toda la lógica |
| `components/TLBView.vue` | Tabla con entradas actuales del TLB, destacar hits/misses |
| `components/MetricsPanel.vue` | Contadores en tiempo real: hits, misses, faults, hit rate |
| `components/ExecutionLog.vue` | Historial paso a paso con colores por tipo de resultado |

**Módulo B — UI e interacción (compañera)**
Responsable de la configuración, gestión de procesos y visualización de memoria:

| Archivo | Responsabilidad |
|---------|----------------|
| `components/ConfigPanel.vue` | Configuración inicial: frames, tamaño TLB, algoritmo |
| `components/ProcessManager.vue` | Crear/eliminar procesos, definir páginas y permisos |
| `components/InstructionInput.vue` | Seleccionar proceso, ingresar dirección virtual, R/W |
| `components/PhysicalMemoryView.vue` | Grilla visual de marcos físicos con su contenido |
| `components/PageTableView.vue` | Tabla de páginas del proceso seleccionado |

### Layout de pantalla

```
┌──────────────────────┬──────────────────────────────┐
│   ConfigPanel        │   ProcessManager              │
├──────────────────────┴──────────────────────────────┤
│   InstructionInput                  MetricsPanel    │
├─────────────────┬──────────────┬────────────────────┤
│ PhysicalMemory  │  PageTable   │  TLBView           │
├─────────────────┴──────────────┴────────────────────┤
│   ExecutionLog                                      │
└─────────────────────────────────────────────────────┘
```

---

## Convenciones

- **Direcciones virtuales:** el usuario las ingresa en hexadecimal (ej. `0x3A4F`)
- **Tamaño de página:** 4 KB fijo (4096 bytes → offset de 12 bits)
- **Parseo de dirección:** `vpn = address >> 12`, `offset = address & 0xFFF`
- **TLB reemplazo:** siempre LRU, independiente del algoritmo de páginas configurado
- **Page fault:** no hay disco real — se simula con un delay en el log y un mensaje descriptivo
- **Colores en log:**
  - Verde → TLB_HIT
  - Amarillo → TLB_MISS
  - Rojo → PAGE_FAULT
  - Gris → CONTEXT_SWITCH
  - Rojo oscuro → PERMISSION_ERROR

---

## Estructura de archivos

```
/src
  /stores
    simulator.js          ← Pinia store (Módulo A)
  /components
    ConfigPanel.vue       ← Módulo B
    ProcessManager.vue    ← Módulo B
    InstructionInput.vue  ← Módulo B
    PhysicalMemoryView.vue ← Módulo B
    PageTableView.vue     ← Módulo B
    TLBView.vue           ← Módulo A
    MetricsPanel.vue      ← Módulo A
    ExecutionLog.vue      ← Módulo A
  App.vue                 ← layout principal
  main.js
```

---

## Notas de implementación

- El store debe ser completamente independiente de los componentes — toda la lógica vive en `simulator.js`, los componentes solo leen estado y llaman acciones.
- Inicializar `physicalMemory` como array de `frameCount` objetos con `processId: null` al arrancar.
- El `tick` es un contador entero que incrementa con cada instrucción — sirve como timestamp para FIFO (loadedAt) y LRU (lastAccessed).
- Para el TLB flush en context switch: filtrar las entradas cuyo `processId !== newProcessId` y eliminarlas.
- La hit rate debe recalcularse después de cada instrucción: `hitRate = tlbHits / totalAccesses * 100`.
