import { defineStore } from 'pinia'
import { makePhysicalMemory, selectVictim } from '../utils/memory'
import { parseSegmentOffset } from '../utils/address'
import { buildSteps } from '../utils/stepBuilder'

export const useSimulatorStore = defineStore('simulator', {
  state: () => ({
    config: {
      frameCount: 8,
      tlbSize: 4,
      algorithm: 'FIFO',
      pageFaultPenalty: 100,
      tlbMissPenalty: 10,
    },
    physicalMemory: makePhysicalMemory(8),
    processes: [],
    tlb: [],
    disk: [],
    currentProcessId: null,
    simulationActive: false,
    metrics: {
      tlbHits: 0,
      tlbMisses: 0,
      pageFaults: 0,
      totalAccesses: 0,
      hitRate: 0,
      swapOuts: 0,
      swapIns: 0,
    },
    executionLog: [],
    tick: 0,
    _nextProcessId: 1,
    stepper: {
      active: true,
      running: false,
      steps: [],
      currentIdx: 0,
      animationKey: 0,
      _processId: null,
      _virtualAddress: null,
      _operation: null,
      _vpn: null,
      _offset: null,
      _isContextSwitch: false,
      _permissionError: null,
      _tlbHit: false,
      _pageValid: false,
      _pfn: null,
      _isSwapIn: false,
      _diskIdx: -1,
      _freeFrame: null,
      _victim: null,
      _victimVpn: null,
      _victimProcessId: null,
      _victimDirty: false,
      _snapshots: [],
      _segmentId: null,
      _addressInSegment: null,
      _segmentEntry: null,
      _segmentFault: null,
    },
  }),

  getters: {
    simulationStarted: (state) => state.simulationActive,
    freeFrameCount: (state) => state.physicalMemory.filter(f => f.processId === null).length,
    activeSubsystem: (state) => {
      if (!state.stepper.running) return null
      const step = state.stepper.steps[state.stepper.currentIdx]
      if (!step) return null
      const map = {
        CONTEXT_SWITCH: 'instruction',
        PARSE: 'tlb',
        SEGMENT_CHECK: 'pagetable',
        TLB_LOOKUP: 'tlb', APPLY_HIT: 'tlb', UPDATE_TLB: 'tlb', APPLY_MISS: 'tlb',
        PAGE_TABLE: 'pagetable', PAGE_TABLE_FAULT: 'pagetable',
        CHECK_DISK: 'disk',
        SELECT_FRAME_FREE: 'ram', SELECT_FRAME_VICTIM: 'ram', EVICT: 'ram', LOAD_PAGE: 'ram',
      }
      return map[step.id] ?? null
    },
  },

  actions: {
    // ─── Helpers internos ──────────────────────────────────────────────────

    // Devuelve la entrada TLB para (processId, vpn) o null si no existe.
    _tlbLookup(processId, vpn) {
      return this.tlb.find(e => e.processId === processId && e.vpn === vpn) ?? null
    },

    // Inserta o actualiza una entrada en la TLB.
    // Si está llena, desaloja la entrada con menor lastAccessed (LRU del TLB).
    _tlbInsert(processId, vpn, pfn) {
      const existing = this._tlbLookup(processId, vpn)
      if (existing) {
        existing.pfn = pfn
        existing.lastAccessed = this.tick
        return
      }
      if (this.tlb.length >= this.config.tlbSize) {
        const times = this.tlb.map(e => e.lastAccessed)
        this.tlb.splice(times.indexOf(Math.min(...times)), 1)
      }
      this.tlb.push({ vpn, pfn, processId, lastAccessed: this.tick })
    },

    // Recalcula hitRate a partir de los contadores acumulados.
    _recalcHitRate() {
      this.metrics.hitRate = this.metrics.totalAccesses > 0
        ? (this.metrics.tlbHits / this.metrics.totalAccesses) * 100
        : 0
    },

    _takeSnapshot() {
      return {
        physicalMemory: JSON.parse(JSON.stringify(this.physicalMemory)),
        tlb: JSON.parse(JSON.stringify(this.tlb)),
        processes: JSON.parse(JSON.stringify(this.processes)),
        disk: JSON.parse(JSON.stringify(this.disk)),
        executionLog: JSON.parse(JSON.stringify(this.executionLog)),
        tick: this.tick,
        metrics: { ...this.metrics },
        currentProcessId: this.currentProcessId,
      }
    },

    _restoreSnapshot(snap) {
      this.physicalMemory = snap.physicalMemory
      this.tlb = snap.tlb
      this.processes = snap.processes
      this.disk = snap.disk
      this.executionLog = snap.executionLog
      this.tick = snap.tick
      this.metrics = { ...snap.metrics }
      this.currentProcessId = snap.currentProcessId
    },

    // Aplica las mutaciones de estado correspondientes a un paso del stepper.
    // Se llama al LLEGAR a un paso (no al salir), para que los efectos sean
    // visibles mientras ese paso está activo en la UI.
    _applyStep(step) {
      const s = this.stepper
      switch (step.id) {
        case 'CONTEXT_SWITCH': {
          this.executionLog.push({
            tick: this.tick, processId: s._processId, virtualAddress: s._virtualAddress,
            operation: s._operation, vpn: null, offset: null,
            result: 'CONTEXT_SWITCH', frameAssigned: null, victimVpn: null,
            detail: `Cambio de contexto: proceso ${this.currentProcessId ?? '–'} → proceso ${s._processId}. TLB vaciada.`,
          })
          this.tlb = []
          this.currentProcessId = s._processId
          break
        }
        case 'PARSE': {
          break
        }
        case 'SEGMENT_CHECK': {
          if (s._segmentFault) {
            this.executionLog.push({
              tick: this.tick, processId: s._processId, virtualAddress: s._virtualAddress,
              operation: s._operation, vpn: null, offset: null,
              result: 'SEGMENT_FAULT', frameAssigned: null, victimVpn: null,
              detail: s._segmentFault,
            })
            this.tick++
          } else if (s._permissionError) {
            this.executionLog.push({
              tick: this.tick, processId: s._processId, virtualAddress: s._virtualAddress,
              operation: s._operation, vpn: s._vpn, offset: s._offset,
              result: 'PERMISSION_ERROR', frameAssigned: null, victimVpn: null,
              detail: s._permissionError,
            })
            this.tick++
          } else {
            this.metrics.totalAccesses++
          }
          break
        }
        case 'TLB_LOOKUP':
        case 'CHECK_DISK':
        case 'SELECT_FRAME_FREE':
        case 'SELECT_FRAME_VICTIM': {
          break
        }
        case 'PAGE_TABLE': {
          this.metrics.tlbMisses++
          break
        }
        case 'PAGE_TABLE_FAULT': {
          this.metrics.tlbMisses++
          this.metrics.pageFaults++
          break
        }
        case 'APPLY_HIT': {
          this.metrics.tlbHits++
          const tlbE = this._tlbLookup(s._processId, s._vpn)
          if (tlbE) tlbE.lastAccessed = this.tick
          const frameH = this.physicalMemory[s._pfn]
          if (frameH) frameH.lastAccessed = this.tick
          if (s._operation === 'W') {
            const procH = this.processes.find(p => p.id === s._processId)
            const pgH = procH?.pageTable.find(p => p.vpn === s._vpn)
            if (pgH) pgH.dirty = true
            if (frameH) frameH.dirty = true
          }
          break
        }
        case 'APPLY_MISS': {
          this._tlbInsert(s._processId, s._vpn, s._pfn)
          const frameM = this.physicalMemory[s._pfn]
          if (frameM) frameM.lastAccessed = this.tick
          if (s._operation === 'W') {
            const procM = this.processes.find(p => p.id === s._processId)
            const pgM = procM?.pageTable.find(p => p.vpn === s._vpn)
            if (pgM) pgM.dirty = true
            if (frameM) frameM.dirty = true
          }
          break
        }
        case 'EVICT': {
          const vProc = this.processes.find(p => p.id === s._victimProcessId)
          const vPage = vProc?.pageTable.find(p => p.vpn === s._victimVpn)
          if (vPage) { vPage.valid = false; vPage.pfn = null; vPage.dirty = false }
          const existIdx = this.disk.findIndex(d => d.processId === s._victimProcessId && d.vpn === s._victimVpn)
          if (existIdx !== -1) this.disk.splice(existIdx, 1)
          this.disk.push({ processId: s._victimProcessId, vpn: s._victimVpn, dirty: s._victimDirty, evictedAt: this.tick, initial: false })
          this.metrics.swapOuts++
          this.tlb = this.tlb.filter(e => !(e.processId === s._victimProcessId && e.vpn === s._victimVpn))
          break
        }
        case 'LOAD_PAGE': {
          if (s._isSwapIn && s._diskIdx !== -1) {
            this.disk.splice(s._diskIdx, 1)
            this.metrics.swapIns++
          }
          const frameL = this.physicalMemory[s._pfn]
          if (frameL) {
            frameL.processId = s._processId; frameL.vpn = s._vpn
            frameL.dirty = false; frameL.loadedAt = this.tick; frameL.lastAccessed = this.tick
          }
          const pEntry = this.processes.find(p => p.id === s._processId)?.pageTable.find(p => p.vpn === s._vpn)
          if (pEntry) { pEntry.valid = true; pEntry.pfn = s._pfn; pEntry.dirty = false }
          break
        }
        case 'UPDATE_TLB': {
          this._tlbInsert(s._processId, s._vpn, s._pfn)
          if (s._operation === 'W') {
            const procU = this.processes.find(p => p.id === s._processId)
            const pgU = procU?.pageTable.find(p => p.vpn === s._vpn)
            if (pgU) pgU.dirty = true
            const frameU = this.physicalMemory[s._pfn]
            if (frameU) frameU.dirty = true
          }
          break
        }
        case 'FINALIZE': {
          const baseLog = {
            tick: this.tick, processId: s._processId, virtualAddress: s._virtualAddress,
            operation: s._operation, vpn: s._vpn, offset: s._offset,
          }
          if (s._tlbHit) {
            this.executionLog.push({
              ...baseLog, result: 'TLB_HIT', frameAssigned: s._pfn, victimVpn: null,
              detail: `TLB HIT: VPN ${s._vpn} → marco físico ${s._pfn}. No se consultó la tabla de páginas.`,
            })
          } else if (s._pageValid) {
            this.executionLog.push({
              ...baseLog, result: 'TLB_MISS', frameAssigned: s._pfn, victimVpn: null,
              detail: `TLB MISS: VPN ${s._vpn} en tabla de páginas → marco ${s._pfn}. Traducción cargada en TLB.`,
            })
          } else {
            this.executionLog.push({
              ...baseLog, result: 'PAGE_FAULT', frameAssigned: s._pfn, victimVpn: s._victimVpn,
              tlbMiss: true, swapIn: s._isSwapIn, swapOut: s._victimVpn !== null,
              detail: (() => {
                if (s._isSwapIn && s._victimVpn !== null)
                  return `PAGE FAULT (swap-in): VPN ${s._vpn} recuperada del disco. Víctima VPN ${s._victimVpn} desalojada del marco ${s._pfn}.`
                if (s._isSwapIn)
                  return `PAGE FAULT (swap-in): VPN ${s._vpn} recuperada del disco. Marco libre ${s._pfn} asignado.`
                if (s._victimVpn !== null)
                  return `PAGE FAULT (carga inicial): VPN ${s._vpn} no estaba en RAM ni en disco. Víctima VPN ${s._victimVpn} desalojada ("swap out") del marco ${s._pfn}.`
                return `PAGE FAULT (carga inicial): VPN ${s._vpn} no estaba en RAM ni en disco. Marco libre ${s._pfn} asignado.`
              })(),
            })
          }
          this.tick++
          this._recalcHitRate()
          break
        }
      }
    },

    // ─── Acciones públicas ─────────────────────────────────────────────────

    startSimulation() {
      this.simulationActive = true
    },

    toggleStepper() {
      if (this.stepper.running) this.completeAllSteps()
      this.stepper.active = !this.stepper.active
    },

    replayAnimation() {
      if (this.stepper.running) this.stepper.animationKey++
    },

    completeAllSteps() {
      while (this.stepper.running) this.advanceStep()
    },

    // Punto de entrada desde el componente — en modo normal llama executeInstruction
    // directamente; en modo stepper pre-computa los pasos sin mutar estado.
    beginInstruction(processId, segmentId, addressInSegment, operation) {
      if (!this.stepper.active) {
        this.executeInstruction(processId, segmentId, addressInSegment, operation)
        return
      }

      const { steps, meta } = buildSteps({
        processId, segmentId, addressInSegment, operation,
        currentProcessId: this.currentProcessId,
        processes: this.processes,
        tlb: this.tlb,
        physicalMemory: this.physicalMemory,
        disk: this.disk,
        config: this.config,
        tick: this.tick,
      })

      const s = this.stepper
      Object.assign(s, meta)
      s.steps = steps
      s.currentIdx = 0
      s.animationKey++
      s._snapshots = [this._takeSnapshot()]
      s.running = true
      this._applyStep(steps[0])
    },

    advanceStep() {
      const s = this.stepper
      if (!s.running) return

      if (s.currentIdx >= s.steps.length - 1) {
        s.running = false
        return
      }

      const nextIdx = s.currentIdx + 1
      s._snapshots[nextIdx] = this._takeSnapshot()
      s.currentIdx = nextIdx
      s.animationKey++
      this._applyStep(s.steps[nextIdx])
    },

    prevStep() {
      const s = this.stepper
      if (!s.running || s.currentIdx <= 0) return
      this._restoreSnapshot(s._snapshots[s.currentIdx])
      s.currentIdx--
      s.animationKey++
    },

    executeInstruction(processId, segmentId, addressInSegment, operation) {
      const displayAddress = `S${segmentId}:${addressInSegment}`

      // ── Paso 1: context switch ─────────────────────────────────────────
      if (processId !== this.currentProcessId) {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress: displayAddress,
          operation, vpn: null, offset: null,
          result: 'CONTEXT_SWITCH', frameAssigned: null, victimVpn: null,
          detail: `Cambio de contexto: proceso ${this.currentProcessId ?? '–'} → proceso ${processId}. TLB vaciada.`,
        })
        this.tlb = []
        this.currentProcessId = processId
      }

      // ── Paso 2: parsear offset dentro del segmento ────────────────────
      const { pageInSegment, byteOffset } = parseSegmentOffset(addressInSegment)

      // ── Paso 3: tabla de segmentos ────────────────────────────────────
      const process = this.processes.find(p => p.id === processId)
      if (!process) {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress: displayAddress,
          operation, vpn: null, offset: null,
          result: 'SEGMENT_FAULT', frameAssigned: null, victimVpn: null,
          detail: `Proceso ${processId} no encontrado.`,
        })
        this.tick++
        return
      }

      const segEntry = process.segmentTable.find(s => s.segmentId === segmentId)
      if (!segEntry) {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress: displayAddress,
          operation, vpn: null, offset: null,
          result: 'SEGMENT_FAULT', frameAssigned: null, victimVpn: null,
          detail: `Segmento ${segmentId} no existe en el proceso ${processId}.`,
        })
        this.tick++
        return
      }

      if (pageInSegment >= segEntry.limitPages) {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress: displayAddress,
          operation, vpn: null, offset: null,
          result: 'SEGMENT_FAULT', frameAssigned: null, victimVpn: null,
          detail: `Violación de segmento: página ${pageInSegment} fuera del límite del segmento "${segEntry.name}" (límite: ${segEntry.limitPages} páginas).`,
        })
        this.tick++
        return
      }

      const vpn = segEntry.baseVPN + pageInSegment
      const offset = byteOffset

      if (operation === 'W' && segEntry.permissions === 'R') {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress: displayAddress,
          operation, vpn, offset,
          result: 'PERMISSION_ERROR', frameAssigned: null, victimVpn: null,
          detail: `Acceso denegado: segmento "${segEntry.name}" (S${segmentId}) es de solo lectura.`,
        })
        this.tick++
        return
      }

      this.metrics.totalAccesses++

      const pageEntry = process.pageTable.find(p => p.vpn === vpn)

      // ── Paso 4: buscar en TLB ──────────────────────────────────────────
      const tlbEntry = this._tlbLookup(processId, vpn)

      if (tlbEntry) {
        this.metrics.tlbHits++
        const pfn = tlbEntry.pfn
        tlbEntry.lastAccessed = this.tick

        const frame = this.physicalMemory[pfn]
        frame.lastAccessed = this.tick

        if (operation === 'W') {
          pageEntry.dirty = true
          frame.dirty = true
        }

        this.executionLog.push({
          tick: this.tick, processId, virtualAddress: displayAddress, operation, vpn, offset,
          result: 'TLB_HIT', frameAssigned: pfn, victimVpn: null,
          detail: `TLB HIT: S${segmentId}+p${pageInSegment} → VPN ${vpn} → marco físico ${pfn}.`,
        })
      } else {
        this.metrics.tlbMisses++

        // ── Paso 5: buscar en tabla de páginas ─────────────────────────
        if (pageEntry.valid) {
          const pfn = pageEntry.pfn
          this._tlbInsert(processId, vpn, pfn)

          const frame = this.physicalMemory[pfn]
          frame.lastAccessed = this.tick

          if (operation === 'W') {
            pageEntry.dirty = true
            frame.dirty = true
          }

          this.executionLog.push({
            tick: this.tick, processId, virtualAddress: displayAddress, operation, vpn, offset,
            result: 'TLB_MISS', frameAssigned: pfn, victimVpn: null,
            detail: `TLB MISS: VPN ${vpn} en tabla de páginas → marco ${pfn}. Traducción cargada en TLB.`,
          })
        } else {
          // ── Paso 6: PAGE FAULT ─────────────────────────────────────────
          this.metrics.pageFaults++

          const diskIdx = this.disk.findIndex(d => d.processId === processId && d.vpn === vpn)
          const isSwapIn = diskIdx !== -1

          let pfn
          let victimVpn = null

          const freeFrame = this.physicalMemory.find(f => f.processId === null)

          if (freeFrame) {
            pfn = freeFrame.frameId
            freeFrame.processId = processId
            freeFrame.vpn = vpn
            freeFrame.dirty = false
            freeFrame.loadedAt = this.tick
            freeFrame.lastAccessed = this.tick
          } else {
            const victim = selectVictim(this.physicalMemory, this.config.algorithm)
            victimVpn = victim.vpn
            pfn = victim.frameId

            const victimProcess = this.processes.find(p => p.id === victim.processId)
            if (victimProcess) {
              const victimPage = victimProcess.pageTable.find(p => p.vpn === victim.vpn)
              if (victimPage) {
                victimPage.valid = false
                victimPage.pfn = null
                victimPage.dirty = false
              }
            }

            const existingDiskIdx = this.disk.findIndex(
              d => d.processId === victim.processId && d.vpn === victim.vpn,
            )
            if (existingDiskIdx !== -1) this.disk.splice(existingDiskIdx, 1)
            this.disk.push({
              processId: victim.processId, vpn: victim.vpn,
              dirty: victim.dirty, evictedAt: this.tick,
            })
            this.metrics.swapOuts++

            this.tlb = this.tlb.filter(
              e => !(e.processId === victim.processId && e.vpn === victim.vpn),
            )

            victim.processId = processId
            victim.vpn = vpn
            victim.dirty = false
            victim.loadedAt = this.tick
            victim.lastAccessed = this.tick
          }

          pageEntry.valid = true
          pageEntry.pfn = pfn
          pageEntry.dirty = false

          if (isSwapIn) {
            this.disk.splice(diskIdx, 1)
            this.metrics.swapIns++
          }

          this._tlbInsert(processId, vpn, pfn)

          if (operation === 'W') {
            pageEntry.dirty = true
            this.physicalMemory[pfn].dirty = true
          }

          this.executionLog.push({
            tick: this.tick, processId, virtualAddress: displayAddress, operation, vpn, offset,
            result: 'PAGE_FAULT', frameAssigned: pfn, victimVpn,
            tlbMiss: true, swapIn: isSwapIn, swapOut: victimVpn !== null,
            detail: (() => {
              if (isSwapIn && victimVpn !== null)
                return `PAGE FAULT (swap-in): VPN ${vpn} recuperada del disco. Víctima VPN ${victimVpn} desalojada del marco ${pfn}.`
              if (isSwapIn)
                return `PAGE FAULT (swap-in): VPN ${vpn} recuperada del disco. Marco libre ${pfn} asignado.`
              if (victimVpn !== null)
                return `PAGE FAULT (carga inicial): VPN ${vpn} no estaba en RAM ni en disco. Víctima VPN ${victimVpn} desalojada del marco ${pfn}.`
              return `PAGE FAULT (carga inicial): VPN ${vpn} no estaba en RAM ni en disco. Marco libre ${pfn} asignado.`
            })(),
          })
        }
      }

      // ── Paso 10–11 ────────────────────────────────────────────────────
      this.tick++
      this._recalcHitRate()
    },

    resetSimulator() {
      this.physicalMemory = makePhysicalMemory(this.config.frameCount)
      this.processes = []
      this.tlb = []
      this.disk = []
      this.currentProcessId = null
      this.simulationActive = false
      this.metrics = { tlbHits: 0, tlbMisses: 0, pageFaults: 0, totalAccesses: 0, hitRate: 0, swapOuts: 0, swapIns: 0 }
      this.executionLog = []
      this.tick = 0
      this._nextProcessId = 1
      const wasActive = this.stepper.active
      this.stepper = {
        active: wasActive, running: false, steps: [], currentIdx: 0, animationKey: 0,
        _snapshots: [],
        _processId: null, _virtualAddress: null, _operation: null,
        _segmentId: null, _addressInSegment: null, _segmentEntry: null, _segmentFault: null,
        _vpn: null, _offset: null, _isContextSwitch: false, _permissionError: null,
        _tlbHit: false, _pageValid: false, _pfn: null,
        _isSwapIn: false, _diskIdx: -1, _freeFrame: null,
        _victim: null, _victimVpn: null, _victimProcessId: null, _victimDirty: false,
      }
    },

    // Crea un proceso con tabla de segmentos + tabla de páginas plana.
    // segments = [{ name, pageCount, permissions }]
    // Todas las páginas empiezan en disco — demand paging.
    addProcess(name, segments) {
      const id = this._nextProcessId++
      const segmentTable = []
      const pageTable = []
      let baseVPN = 0

      segments.forEach((seg, idx) => {
        segmentTable.push({
          segmentId: idx,
          name: seg.name,
          baseVPN,
          limitPages: seg.pageCount,
          permissions: seg.permissions ?? 'RW',
        })
        for (let i = 0; i < seg.pageCount; i++) {
          pageTable.push({
            vpn: baseVPN + i,
            pfn: null,
            valid: false,
            permissions: seg.permissions ?? 'RW',
            dirty: false,
          })
        }
        baseVPN += seg.pageCount
      })

      this.processes.push({ id, name, segmentTable, pageTable })
      pageTable.forEach(page => {
        this.disk.push({ processId: id, vpn: page.vpn, dirty: false, evictedAt: this.tick, initial: true })
      })
      return id
    },

    removeProcess(processId) {
      // Liberar los marcos físicos ocupados por el proceso.
      this.physicalMemory.forEach(frame => {
        if (frame.processId === processId) {
          frame.processId = null
          frame.vpn = null
          frame.dirty = false
        }
      })
      this.tlb = this.tlb.filter(e => e.processId !== processId)
      this.disk = this.disk.filter(d => d.processId !== processId)
      this.processes = this.processes.filter(p => p.id !== processId)
      if (this.currentProcessId === processId) this.currentProcessId = null
    },

    // Solo disponible antes de iniciar la simulación (tick === 0).
    // Si cambia frameCount, reinicializa la memoria física.
    updateConfig(newConfig) {
      if (this.tick > 0) return
      const prev = this.config.frameCount
      this.config = { ...this.config, ...newConfig }
      if (newConfig.frameCount !== undefined && newConfig.frameCount !== prev) {
        this.physicalMemory = makePhysicalMemory(this.config.frameCount)
      }
    },
  },
})
