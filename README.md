# Memory Management Simulator

An interactive web simulator for operating-system memory management. You create processes, run memory instructions step by step, and watch the segment tables, page tables, physical frames, TLB and metrics update in real time.

Final project for the **Operating Systems** course — Systems Engineering, Universidad Tecnológica de Pereira.

---

## What it simulates

- **Segmented paging** — each process has a segment table (its logical regions) mapped onto a flat page table; address translation runs in two phases (segment → page).
- **Paging** with fixed 4 KB pages (12-bit offset)
- **TLB** (Translation Lookaside Buffer) with its own LRU replacement and real-time hit/miss metrics
- **Page replacement algorithms** — FIFO and LRU, selectable before running
- **Page faults** with victim selection and dirty-bit write-back to "disk"
- **Permissions** per segment/page (R / RW): writing to a read-only page raises a permission error; an out-of-bounds access or a write to a read-only segment raises a segment fault
- **Context switch** flushes the TLB when the active process changes
- **Step-by-step execution log**, color-coded by event type
- **Accumulated metrics** — TLB hits/misses, page faults, total accesses, hit rate

---

## Address translation (two phases)

```
virtual address = S{segmentId} : {offsetInSegment}

Phase 1 — segment table
  pageInSegment = offset >> 12
  pageInSegment ≥ limitPages?     → SEGMENT_FAULT
  write to a read-only segment?   → PERMISSION_ERROR
  vpn = segment.baseVPN + pageInSegment        (absolute VPN)

Phase 2 — TLB → page table → page fault
  TLB hit   → frame number directly
  TLB miss  → look up the page table
  invalid   → PAGE FAULT → assign a free frame, or evict a victim
              (FIFO = oldest loaded, LRU = least recently used;
               write the victim back first if it's dirty)
```

Each instruction advances the system tick, which doubles as the timestamp for FIFO (`loadedAt`) and LRU (`lastAccessed`).

---

## Tech stack

- **Vue 3** (Composition API) — single-page UI, no router
- **Pinia** — global state and all simulation logic (`stores/simulator.js`)
- **Tailwind CSS v4**
- **Vite** — dev server and build
- **Vitest** — unit tests

---

## Running locally

```bash
npm install
npm run dev          # dev server
npm run build        # production build
npm run test         # run unit tests
npm run test:watch   # tests in watch mode
```

---

## How to use it

1. **Configure** the system (physical frames, TLB size, replacement algorithm, penalties). Configuration is locked once you start executing instructions.
2. **Add processes**, defining each one's segments — page count and permissions (R / RW) per segment.
3. **Execute instructions**: pick a process, enter a virtual address (segment + offset) and an operation (R / W). Each instruction advances one tick.
4. **Watch the state** update live: physical memory grid, the active process's segment and page tables, the TLB, the metrics panel, and the execution log.

---

## Tests

Unit tests in `src/stores/__tests__/simulator.test.js` cover TLB hit/miss, page-fault resolution with free-frame assignment, FIFO and LRU replacement when memory is full, permission errors, context-switch TLB flush, and segment-level translation.

---

## Project structure

```
src/
├── stores/
│   ├── simulator.js              # Pinia store — all simulation logic
│   └── __tests__/simulator.test.js
├── utils/                        # address parsing, step building
├── constants/                    # shared constants
└── components/
    ├── ConfigPanel.vue           # initial system configuration
    ├── ProcessManager.vue        # create/remove processes and segments
    ├── InstructionInput.vue      # enter memory instructions
    ├── MetricsPanel.vue          # live counters and hit rate
    ├── PhysicalMemoryView.vue    # physical frame grid
    ├── PageTableView.vue         # active process's page table
    ├── TLBView.vue               # current TLB entries
    └── ExecutionLog.vue          # step-by-step history
```

---

## Team

University group project. Core simulation logic and the TLB / metrics / log views were built by **Emily Perea**; the configuration, process-management and memory-visualization UI by a teammate.
