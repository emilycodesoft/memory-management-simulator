// Crea el array de marcos físicos con todos en estado libre.
export function makePhysicalMemory(frameCount) {
  return Array.from({ length: frameCount }, (_, i) => ({
    frameId: i,
    processId: null,
    vpn: null,
    dirty: false,
    loadedAt: 0,
    lastAccessed: 0,
  }))
}

// Elige el marco víctima para reemplazo según el algoritmo configurado.
// FIFO: el que lleva más tiempo en memoria (menor loadedAt).
// LRU:  el que no se usa hace más tiempo (menor lastAccessed).
export function selectVictim(physicalMemory, algorithm) {
  const occupied = physicalMemory.filter(f => f.processId !== null)
  return algorithm === 'FIFO'
    ? occupied.reduce((min, f) => (f.loadedAt < min.loadedAt ? f : min))
    : occupied.reduce((min, f) => (f.lastAccessed < min.lastAccessed ? f : min))
}
