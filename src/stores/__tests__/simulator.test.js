import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, it, expect } from 'vitest'
import { useSimulatorStore } from '../simulator.js'

// pageInSeg → offset dentro del segmento (páginas de 4 KB)
const pageToAddr = (pageInSeg) => '0x' + (pageInSeg * 0x1000).toString(16).toUpperCase().padStart(4, '0')

// Proceso de un solo segmento RW con n páginas (simplifica los tests existentes)
const oneSeg = (pageCount, permissions = 'RW') =>
  [{ name: 'S0', pageCount, permissions }]

describe('simulatorStore — lógica de simulación de memoria', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSimulatorStore()
  })

  // ─── 1. TLB HIT ──────────────────────────────────────────────────────────
  describe('TLB HIT', () => {
    it('la segunda vez que se accede a la misma dirección es TLB_HIT', () => {
      const pid = store.addProcess('P1', oneSeg(2))

      store.executeInstruction(pid, 0, pageToAddr(0), 'R') // 1ra: PAGE_FAULT → carga en TLB
      store.executeInstruction(pid, 0, pageToAddr(0), 'R') // 2da: debe ser TLB_HIT

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('TLB_HIT')
      expect(store.metrics.tlbHits).toBe(1)
    })
  })

  // ─── 2. TLB MISS → carga en TLB ──────────────────────────────────────────
  describe('TLB MISS', () => {
    it('cuando la página es válida pero no está en TLB, carga la traducción en TLB', () => {
      const pid = store.addProcess('P1', oneSeg(2))

      // Primera instrucción: PAGE_FAULT → página llega a RAM y TLB
      store.executeInstruction(pid, 0, pageToAddr(0), 'R')

      // Vaciar TLB manualmente para forzar miss (la página sigue válida en pageTable)
      store.tlb = []

      store.executeInstruction(pid, 0, pageToAddr(0), 'R')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('TLB_MISS')
      expect(store.tlb).toHaveLength(1)
      expect(store.tlb[0].vpn).toBe(0)
      expect(store.tlb[0].processId).toBe(pid)
    })
  })

  // ─── 3. PAGE FAULT ───────────────────────────────────────────────────────
  describe('PAGE FAULT', () => {
    it('acceder a una página con valid=false dispara PAGE_FAULT y la carga en RAM', () => {
      const pid = store.addProcess('P1', oneSeg(2))

      store.executeInstruction(pid, 0, pageToAddr(0), 'R')

      expect(store.metrics.pageFaults).toBe(1)
      expect(store.executionLog.find(e => e.result === 'PAGE_FAULT')).toBeDefined()

      const process = store.processes.find(p => p.id === pid)
      expect(process.pageTable[0].valid).toBe(true)
      expect(process.pageTable[0].pfn).not.toBeNull()
    })
  })

  // ─── 4. Reemplazo FIFO ───────────────────────────────────────────────────
  describe('Reemplazo FIFO', () => {
    it('cuando la RAM está llena, reemplaza el marco más antiguo (menor loadedAt)', () => {
      store.updateConfig({ frameCount: 2, algorithm: 'FIFO' })
      const pid = store.addProcess('P1', oneSeg(4))

      store.executeInstruction(pid, 0, pageToAddr(0), 'R')
      store.executeInstruction(pid, 0, pageToAddr(1), 'R')

      // página 2 → sin marcos libres → FIFO elige VPN 0 (loadedAt más bajo)
      store.executeInstruction(pid, 0, pageToAddr(2), 'R')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('PAGE_FAULT')
      expect(lastLog.victimVpn).toBe(0)
    })
  })

  // ─── 5. Reemplazo LRU ────────────────────────────────────────────────────
  describe('Reemplazo LRU', () => {
    it('cuando la RAM está llena, reemplaza el marco menos recientemente accedido', () => {
      store.updateConfig({ frameCount: 2, algorithm: 'LRU' })
      const pid = store.addProcess('P1', oneSeg(4))

      store.executeInstruction(pid, 0, pageToAddr(0), 'R')
      store.executeInstruction(pid, 0, pageToAddr(1), 'R')

      // Re-acceder a página 0 → su lastAccessed sube
      store.executeInstruction(pid, 0, pageToAddr(0), 'R')

      // página 2 → LRU elige VPN 1 (lastAccessed más bajo)
      store.executeInstruction(pid, 0, pageToAddr(2), 'R')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('PAGE_FAULT')
      expect(lastLog.victimVpn).toBe(1)
    })
  })

  // ─── 6. Violación de permisos ─────────────────────────────────────────────
  describe('PERMISSION_ERROR', () => {
    it('escribir en un segmento de solo lectura registra PERMISSION_ERROR y no cuenta el acceso', () => {
      const pid = store.addProcess('P1', [
        { name: 'Código', pageCount: 2, permissions: 'R' },
        { name: 'Datos',  pageCount: 2, permissions: 'RW' },
      ])

      store.executeInstruction(pid, 0, pageToAddr(0), 'W')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('PERMISSION_ERROR')
      expect(store.metrics.totalAccesses).toBe(0)
      expect(store.metrics.pageFaults).toBe(0)
    })

    it('leer en un segmento de solo lectura está permitido', () => {
      const pid = store.addProcess('P1', [{ name: 'Código', pageCount: 1, permissions: 'R' }])
      store.executeInstruction(pid, 0, pageToAddr(0), 'R')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).not.toBe('PERMISSION_ERROR')
    })
  })

  // ─── 7. Context switch → TLB flush ───────────────────────────────────────
  describe('CONTEXT_SWITCH', () => {
    it('cambiar de proceso vacía la TLB y registra CONTEXT_SWITCH en el log', () => {
      const pid1 = store.addProcess('P1', oneSeg(2))
      const pid2 = store.addProcess('P2', oneSeg(2))

      store.executeInstruction(pid1, 0, pageToAddr(0), 'R')
      expect(store.tlb.length).toBeGreaterThan(0)
      expect(store.tlb[0].processId).toBe(pid1)

      store.executeInstruction(pid2, 0, pageToAddr(0), 'R')

      const switchLog = store.executionLog.find(
        e => e.result === 'CONTEXT_SWITCH' && e.processId === pid2,
      )
      expect(switchLog).toBeDefined()

      expect(store.tlb.every(e => e.processId === pid2)).toBe(true)
      expect(store.currentProcessId).toBe(pid2)
    })

    it('no genera CONTEXT_SWITCH adicional si se sigue usando el mismo proceso', () => {
      const pid = store.addProcess('P1', oneSeg(2))

      store.executeInstruction(pid, 0, pageToAddr(0), 'R')
      const switchesAfterFirst = store.executionLog.filter(e => e.result === 'CONTEXT_SWITCH').length
      expect(switchesAfterFirst).toBe(1)

      store.executeInstruction(pid, 0, pageToAddr(1), 'R')
      store.executeInstruction(pid, 0, pageToAddr(0), 'R')

      const switchesTotal = store.executionLog.filter(e => e.result === 'CONTEXT_SWITCH').length
      expect(switchesTotal).toBe(1)
    })
  })

  // ─── 8. Segmentación ─────────────────────────────────────────────────────
  describe('SEGMENT_FAULT', () => {
    it('acceder a un segmento inexistente genera SEGMENT_FAULT', () => {
      const pid = store.addProcess('P1', oneSeg(2))

      store.executeInstruction(pid, 99, pageToAddr(0), 'R')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('SEGMENT_FAULT')
      expect(store.metrics.totalAccesses).toBe(0)
    })

    it('acceder a una página fuera del límite del segmento genera SEGMENT_FAULT', () => {
      const pid = store.addProcess('P1', [{ name: 'Código', pageCount: 2, permissions: 'R' }])

      // Segmento 0 tiene 2 páginas (0 y 1). Página 2 está fuera del límite.
      store.executeInstruction(pid, 0, pageToAddr(2), 'R')

      const lastLog = store.executionLog.at(-1)
      expect(lastLog.result).toBe('SEGMENT_FAULT')
      expect(store.metrics.totalAccesses).toBe(0)
    })

    it('acceder a dos segmentos distintos del mismo proceso usa VPNs absolutas separadas', () => {
      const pid = store.addProcess('P1', [
        { name: 'Código', pageCount: 2, permissions: 'R'  },
        { name: 'Datos',  pageCount: 2, permissions: 'RW' },
      ])

      // Segmento 0, página 0 → VPN absoluta 0
      store.executeInstruction(pid, 0, pageToAddr(0), 'R')
      // Segmento 1, página 0 → VPN absoluta 2
      store.executeInstruction(pid, 1, pageToAddr(0), 'W')

      const faults = store.executionLog.filter(e => e.result === 'PAGE_FAULT')
      expect(faults).toHaveLength(2)
      expect(faults[0].vpn).toBe(0)
      expect(faults[1].vpn).toBe(2)
    })
  })
})
