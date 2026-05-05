import { defineStore } from 'pinia'

export const useSimulatorStore = defineStore('simulator', {
  state: () => ({
    config: {
      frameCount: 8,
      tlbSize: 4,
      algorithm: 'FIFO',
      pageFaultPenalty: 100,
      tlbMissPenalty: 10,
    },
    physicalMemory: [],
    processes: [],
    tlb: [],
    currentProcessId: null,
    metrics: {
      tlbHits: 0,
      tlbMisses: 0,
      pageFaults: 0,
      totalAccesses: 0,
      hitRate: 0,
    },
    executionLog: [],
    tick: 0,
  }),

  actions: {
    executeInstruction(processId, virtualAddress, operation) {
      // TODO
    },

    resetSimulator() {
      // TODO
    },

    addProcess(name, pageCount, permissions) {
      // TODO
    },

    removeProcess(processId) {
      // TODO
    },

    updateConfig(config) {
      // TODO
    },
  },
})
