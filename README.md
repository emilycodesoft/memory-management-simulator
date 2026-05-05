# Simulador de Gestión de Memoria con Paginación y TLB

Proyecto final — **Sistemas Operativos**, Ingeniería de Sistemas  
Universidad Tecnológica de Pereira

Herramienta web interactiva que simula la gestión de memoria de un sistema operativo: paginación, algoritmos de reemplazo de páginas (FIFO / LRU), manejo de page faults y TLB (Translation Lookaside Buffer).

---

## Características

- **Paginación con tabla de páginas por proceso** — páginas de 4 KB fijas, offset de 12 bits
- **TLB** con política de reemplazo LRU y métricas en tiempo real (hit rate, miss rate, penalizaciones)
- **Algoritmos de reemplazo de páginas:** FIFO y LRU, configurable antes de iniciar
- **Manejo de page faults** simulado con descarga a disco (dirty bit) y log descriptivo
- **Permisos por página** (R / RW) con detección de escritura en páginas de solo lectura
- **Context switch** con flush automático del TLB al cambiar de proceso
- **Log de ejecución** paso a paso con colores por tipo de evento
- **Métricas acumuladas:** TLB hits, misses, page faults, accesos totales, hit rate

---

## Stack tecnológico

| Herramienta | Versión | Rol |
|---|---|---|
| Vue 3 (Composition API) | ^3.5 | Framework UI |
| Pinia | ^3.0 | Estado global |
| Tailwind CSS | ^4.2 | Estilos |
| Vite | ^8.0 | Bundler / dev server |
| Vitest | ^4.1 | Tests unitarios |

---

## Instalación y uso

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar tests unitarios
npm run test

# Tests en modo watch
npm run test:watch
```

---

## Cómo usar el simulador

1. **Configurar** — en el panel superior izquierdo, definir número de marcos físicos, tamaño del TLB, algoritmo de reemplazo y penalizaciones. La configuración solo puede cambiarse antes de ejecutar instrucciones.

2. **Agregar procesos** — en el panel de gestión de procesos, crear uno o más procesos indicando cuántas páginas tiene y si cada página es de solo lectura (R) o lectura/escritura (RW).

3. **Ejecutar instrucciones** — seleccionar un proceso, ingresar una dirección virtual en hexadecimal (ej. `0x3A4F`) y elegir operación (R / W). Cada instrucción avanza el tick del sistema.

4. **Observar el estado** — los paneles se actualizan en tiempo real:
   - **Memoria física:** grilla de marcos con su contenido actual
   - **Tabla de páginas:** estado de cada página del proceso seleccionado
   - **TLB:** entradas activas con VPN → PFN
   - **Métricas:** hit rate y contadores acumulados
   - **Log:** historial completo con resultado de cada instrucción

---

## Estructura del proyecto

```
src/
├── stores/
│   ├── simulator.js              # Store Pinia — toda la lógica de simulación
│   └── __tests__/
│       └── simulator.test.js     # Tests unitarios del store
└── components/
    ├── ConfigPanel.vue           # Configuración inicial del sistema
    ├── ProcessManager.vue        # Crear y eliminar procesos
    ├── InstructionInput.vue      # Ingreso de instrucciones de memoria
    ├── MetricsPanel.vue          # Contadores y hit rate en tiempo real
    ├── PhysicalMemoryView.vue    # Grilla de marcos físicos
    ├── PageTableView.vue         # Tabla de páginas del proceso activo
    ├── TLBView.vue               # Entradas actuales del TLB
    └── ExecutionLog.vue          # Historial de instrucciones ejecutadas
```

---

## Lógica de simulación

Cada llamada a `executeInstruction(processId, virtualAddress, operation)` sigue este flujo:

```
Dirección virtual (hex)
        │
        ▼
┌───────────────────┐
│  Context switch?  │ ──→ Flush TLB si cambia el proceso activo
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Verificar permisos│ ──→ PERMISSION_ERROR si W en página R
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Buscar en TLB   │ ──→ TLB_HIT: obtener PFN directo
└───────────────────┘
        │ miss
        ▼
┌───────────────────┐
│ Buscar page table │ ──→ valid=true: TLB_MISS + cargar en TLB
└───────────────────┘
        │ invalid
        ▼
┌───────────────────┐
│  PAGE FAULT       │ ──→ Asignar/reemplazar marco (FIFO o LRU)
│  Cargar página    │     Escribir víctima si dirty
└───────────────────┘
        │
        ▼
   Actualizar dirty, lastAccessed, métricas, log, tick
```

---

## Tests

Los tests unitarios en `src/stores/__tests__/simulator.test.js` cubren:

- TLB hit y miss
- Resolución de page fault con asignación de marco libre
- Reemplazo FIFO y LRU cuando la memoria está llena
- Detección de error de permisos
- Context switch con flush del TLB

---

## División de trabajo

| Módulo | Integrante | Archivos |
|---|---|---|
| A — Lógica central | Emily | `stores/simulator.js`, `TLBView.vue`, `MetricsPanel.vue`, `ExecutionLog.vue` |
| B — UI e interacción | Compañera | `ConfigPanel.vue`, `ProcessManager.vue`, `InstructionInput.vue`, `PhysicalMemoryView.vue`, `PageTableView.vue` |
