import { defineStore } from 'pinia'

function makePhysicalMemory(frameCount) {
  return Array.from({ length: frameCount }, (_, i) => ({
    frameId: i,
    processId: null,
    vpn: null,
    dirty: false,
    loadedAt: 0,
    lastAccessed: 0,
  }))
}

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
        TLB_LOOKUP: 'tlb', APPLY_HIT: 'tlb', UPDATE_TLB: 'tlb',
        PAGE_TABLE: 'pagetable', PAGE_TABLE_FAULT: 'pagetable', APPLY_MISS: 'pagetable',
        CHECK_DISK: 'disk',
        SELECT_FRAME_FREE: 'ram', SELECT_FRAME_VICTIM: 'ram', EVICT: 'ram', LOAD_PAGE: 'ram',
      }
      return map[step.id] ?? null
    },
  },

  actions: {
    // ─── Helpers internos ──────────────────────────────────────────────────

    // Divide la dirección virtual en VPN (número de página) y offset.
    // Con páginas de 4 KB: los 12 bits bajos son el offset, el resto es el VPN.
    _parseAddress(virtualAddress) {
      const addr = parseInt(virtualAddress, 16)
      return { vpn: addr >>> 12, offset: addr & 0xFFF }
    },

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
        const lruIdx = this.tlb.reduce(
          (minIdx, e, i) => (e.lastAccessed < this.tlb[minIdx].lastAccessed ? i : minIdx),
          0,
        )
        this.tlb.splice(lruIdx, 1)
      }
      this.tlb.push({ vpn, pfn, processId, lastAccessed: this.tick })
    },

    // Elige el marco víctima para reemplazo según el algoritmo configurado.
    // FIFO: el que lleva más tiempo en memoria (menor loadedAt).
    // LRU:  el que no se usa hace más tiempo (menor lastAccessed).
    _selectVictim() {
      const occupied = this.physicalMemory.filter(f => f.processId !== null)
      return this.config.algorithm === 'FIFO'
        ? occupied.reduce((min, f) => (f.loadedAt < min.loadedAt ? f : min))
        : occupied.reduce((min, f) => (f.lastAccessed < min.lastAccessed ? f : min))
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
        case 'PERMISSIONS': {
          if (s._permissionError) {
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
              swapIn: s._isSwapIn,
              detail: (() => {
                if (s._isSwapIn && s._victimVpn !== null)
                  return `PAGE FAULT (swap-in): VPN ${s._vpn} recuperada del disco. Víctima VPN ${s._victimVpn} desalojada del marco ${s._pfn}.`
                if (s._isSwapIn)
                  return `PAGE FAULT (swap-in): VPN ${s._vpn} recuperada del disco. Marco libre ${s._pfn} asignado.`
                if (s._victimVpn !== null)
                  return `PAGE FAULT (carga inicial): VPN ${s._vpn} no estaba en RAM ni en disco. Víctima VPN ${s._victimVpn} desalojada del marco ${s._pfn}.`
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
    beginInstruction(processId, virtualAddress, operation) {
      if (!this.stepper.active) {
        this.executeInstruction(processId, virtualAddress, operation)
        return
      }

      const s = this.stepper
      const steps = []

      s._processId = processId
      s._virtualAddress = virtualAddress
      s._operation = operation
      s._permissionError = null
      s._tlbHit = false
      s._pageValid = false
      s._pfn = null
      s._isSwapIn = false
      s._diskIdx = -1
      s._freeFrame = null
      s._victim = null
      s._victimVpn = null
      s._victimProcessId = null
      s._victimDirty = false

      // Paso 1 — cambio de contexto
      s._isContextSwitch = processId !== this.currentProcessId
      if (s._isContextSwitch) {
        steps.push({
          id: 'CONTEXT_SWITCH',
          label: 'Cambio de contexto',
          detail: `Proceso ${this.currentProcessId ?? '–'} → proceso ${processId}. TLB se vaciará.`,
          type: 'switch',
        })
      }

      // Paso 2 — parsear dirección
      const { vpn, offset } = this._parseAddress(virtualAddress)
      s._vpn = vpn
      s._offset = offset
      steps.push({
        id: 'PARSE',
        label: 'Parsear dirección',
        detail: `${virtualAddress} → VPN ${vpn}, offset 0x${offset.toString(16).toUpperCase().padStart(3, '0')}`,
        type: 'info',
      })

      // Paso 3 — verificar permisos
      const process = this.processes.find(p => p.id === processId)
      const pageEntry = process?.pageTable.find(p => p.vpn === vpn)
      if (!process) {
        s._permissionError = `Proceso ${processId} no encontrado.`
      } else if (!pageEntry) {
        s._permissionError = `VPN ${vpn} no existe en la tabla de páginas del proceso ${processId}.`
      } else if (operation === 'W' && pageEntry.permissions === 'R') {
        s._permissionError = `Acceso denegado: VPN ${vpn} es de solo lectura (proceso ${processId}).`
      }
      if (s._permissionError) {
        steps.push({ id: 'PERMISSIONS', label: 'Verificar permisos', detail: s._permissionError, type: 'error' })
        s.steps = steps
        s.currentIdx = 0
        s.animationKey++
        s._snapshots = []
        s._snapshots[0] = this._takeSnapshot()
        s.running = true
        this._applyStep(steps[0])
        return
      }
      steps.push({
        id: 'PERMISSIONS',
        label: 'Verificar permisos',
        detail: `VPN ${vpn}: permisos OK (${pageEntry.permissions}${operation === 'W' ? ', escritura permitida' : ''}).`,
        type: 'hit',
      })

      // Paso 4 — buscar en TLB
      // _tlbLookup filtra por processId, así que es correcto aunque haya context switch pendiente.
      const tlbEntry = this._tlbLookup(processId, vpn)
      s._tlbHit = !!tlbEntry

      if (s._tlbHit) {
        s._pfn = tlbEntry.pfn
        steps.push({
          id: 'TLB_LOOKUP',
          label: 'Buscar en TLB',
          detail: `TLB HIT: VPN ${vpn} → marco ${tlbEntry.pfn}. No se consulta la tabla de páginas.`,
          type: 'hit',
        })
        steps.push({
          id: 'APPLY_HIT',
          label: 'Actualizar estado',
          detail: `Actualizar lastAccessed en TLB y RAM.${operation === 'W' ? ' Marcar dirty (escritura).' : ''}`,
          type: 'info',
        })
      } else {
        steps.push({
          id: 'TLB_LOOKUP',
          label: 'Buscar en TLB',
          detail: `TLB MISS: VPN ${vpn} no está en TLB. Consultando tabla de páginas...`,
          type: 'miss',
        })

        s._pageValid = pageEntry.valid
        if (pageEntry.valid) {
          s._pfn = pageEntry.pfn
          steps.push({
            id: 'PAGE_TABLE',
            label: 'Buscar en tabla de páginas',
            detail: `VPN ${vpn} está en RAM → marco ${pageEntry.pfn}. Cargando traducción en TLB.`,
            type: 'miss',
          })
          steps.push({
            id: 'APPLY_MISS',
            label: 'Cargar traducción en TLB',
            detail: `Insertar VPN ${vpn} → marco ${pageEntry.pfn} en TLB.${operation === 'W' ? ' Marcar dirty.' : ''}`,
            type: 'info',
          })
        } else {
          steps.push({
            id: 'PAGE_TABLE_FAULT',
            label: 'Buscar en tabla de páginas',
            detail: `VPN ${vpn} NO está en RAM (valid=false) → PAGE FAULT.`,
            type: 'fault',
          })

          const diskIdx = this.disk.findIndex(d => d.processId === processId && d.vpn === vpn)
          s._isSwapIn = diskIdx !== -1
          s._diskIdx = diskIdx
          steps.push({
            id: 'CHECK_DISK',
            label: 'Verificar disco',
            detail: s._isSwapIn
              ? `VPN ${vpn} encontrada en disco → swap-in (fue desalojada anteriormente).`
              : `VPN ${vpn} no está en disco → carga inicial (primera vez en RAM).`,
            type: s._isSwapIn ? 'hit' : 'info',
          })

          const freeFrame = this.physicalMemory.find(f => f.processId === null)
          if (freeFrame) {
            s._freeFrame = freeFrame.frameId
            s._victim = null
            s._pfn = freeFrame.frameId
            steps.push({
              id: 'SELECT_FRAME_FREE',
              label: 'Seleccionar marco',
              detail: `Marco libre disponible: F${freeFrame.frameId}. No se necesita desalojar ninguna página.`,
              type: 'info',
            })
          } else {
            const victim = this._selectVictim()
            s._freeFrame = null
            s._victim = victim.frameId
            s._victimVpn = victim.vpn
            s._victimProcessId = victim.processId
            s._victimDirty = victim.dirty
            s._pfn = victim.frameId
            const victimProcName = this.processes.find(p => p.id === victim.processId)?.name ?? `P${victim.processId}`
            steps.push({
              id: 'SELECT_FRAME_VICTIM',
              label: `Seleccionar víctima (${this.config.algorithm})`,
              detail: `RAM llena. ${this.config.algorithm}: víctima VPN ${victim.vpn} de ${victimProcName} en marco F${victim.frameId}${victim.dirty ? ' (dirty → requiere escritura a disco)' : ' (clean → descarte gratis)'}.`,
              type: 'fault',
            })
            steps.push({
              id: 'EVICT',
              label: 'Desalojar víctima',
              detail: `Invalidar VPN ${victim.vpn} en tabla de páginas, eliminar de TLB, enviar a disco${victim.dirty ? ' (dirty)' : ' (clean)'}.`,
              type: victim.dirty ? 'fault' : 'miss',
            })
          }

          steps.push({
            id: 'LOAD_PAGE',
            label: 'Cargar página en RAM',
            detail: `Asignar marco F${s._pfn} a VPN ${vpn}. Actualizar tabla de páginas (valid=true, pfn=${s._pfn}).`,
            type: 'info',
          })
          steps.push({
            id: 'UPDATE_TLB',
            label: 'Actualizar TLB',
            detail: `Insertar VPN ${vpn} → marco ${s._pfn} en TLB.${operation === 'W' ? ' Marcar dirty.' : ''}`,
            type: 'info',
          })
        }
      }

      steps.push({
        id: 'FINALIZE',
        label: 'Finalizar instrucción',
        detail: `Registrar resultado en log, incrementar tick (→ t${this.tick + 1}), recalcular hit rate.`,
        type: 'info',
      })

      s.steps = steps
      s.currentIdx = 0
      s.animationKey++
      s._snapshots = []
      s._snapshots[0] = this._takeSnapshot()
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

    executeInstruction(processId, virtualAddress, operation) {
      // ── Paso 1: context switch ─────────────────────────────────────────
      // Si cambia el proceso activo, se vacía la TLB completa porque las
      // traducciones de otro proceso no son válidas para el nuevo contexto.
      if (processId !== this.currentProcessId) {
        this.executionLog.push({
          tick: this.tick,
          processId,
          virtualAddress,
          operation,
          vpn: null,
          offset: null,
          result: 'CONTEXT_SWITCH',
          frameAssigned: null,
          victimVpn: null,
          detail: `Cambio de contexto: proceso ${this.currentProcessId ?? '–'} → proceso ${processId}. TLB vaciada.`,
        })
        this.tlb = []
        this.currentProcessId = processId
      }

      // ── Paso 2: parsear dirección virtual ─────────────────────────────
      const { vpn, offset } = this._parseAddress(virtualAddress)

      // ── Paso 3: verificar permisos ─────────────────────────────────────
      const process = this.processes.find(p => p.id === processId)
      if (!process) {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress, operation, vpn, offset,
          result: 'PERMISSION_ERROR', frameAssigned: null, victimVpn: null,
          detail: `Proceso ${processId} no encontrado.`,
        })
        this.tick++
        return
      }

      const pageEntry = process.pageTable.find(p => p.vpn === vpn)
      if (!pageEntry) {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress, operation, vpn, offset,
          result: 'PERMISSION_ERROR', frameAssigned: null, victimVpn: null,
          detail: `VPN ${vpn} no existe en la tabla de páginas del proceso ${processId}.`,
        })
        this.tick++
        return
      }

      if (operation === 'W' && pageEntry.permissions === 'R') {
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress, operation, vpn, offset,
          result: 'PERMISSION_ERROR', frameAssigned: null, victimVpn: null,
          detail: `Acceso denegado: página VPN ${vpn} es de solo lectura (proceso ${processId}).`,
        })
        this.tick++
        return
      }

      this.metrics.totalAccesses++

      // ── Paso 4: buscar en TLB ──────────────────────────────────────────
      const tlbEntry = this._tlbLookup(processId, vpn)

      if (tlbEntry) {
        // TLB HIT — traducción encontrada en caché, no hay que ir a memoria.
        this.metrics.tlbHits++
        const pfn = tlbEntry.pfn
        tlbEntry.lastAccessed = this.tick

        // Paso 7: actualizar lastAccessed del marco físico
        const frame = this.physicalMemory[pfn]
        frame.lastAccessed = this.tick

        // Paso 8: marcar dirty si es escritura
        if (operation === 'W') {
          pageEntry.dirty = true
          frame.dirty = true
        }

        // Paso 9: registrar en log
        this.executionLog.push({
          tick: this.tick, processId, virtualAddress, operation, vpn, offset,
          result: 'TLB_HIT',
          frameAssigned: pfn,
          victimVpn: null,
          detail: `TLB HIT: VPN ${vpn} → marco físico ${pfn}. No se consultó la tabla de páginas.`,
        })
      } else {
        // TLB MISS — hay que consultar la tabla de páginas.
        this.metrics.tlbMisses++

        // ── Paso 5: buscar en tabla de páginas ─────────────────────────
        if (pageEntry.valid) {
          // La página está en RAM, solo faltaba en el TLB.
          const pfn = pageEntry.pfn
          this._tlbInsert(processId, vpn, pfn)

          // Paso 7
          const frame = this.physicalMemory[pfn]
          frame.lastAccessed = this.tick

          // Paso 8
          if (operation === 'W') {
            pageEntry.dirty = true
            frame.dirty = true
          }

          // Paso 9
          this.executionLog.push({
            tick: this.tick, processId, virtualAddress, operation, vpn, offset,
            result: 'TLB_MISS',
            frameAssigned: pfn,
            victimVpn: null,
            detail: `TLB MISS: VPN ${vpn} en tabla de páginas → marco ${pfn}. Traducción cargada en TLB.`,
          })
        } else {
          // ── Paso 6: PAGE FAULT — la página no está en RAM ─────────────
          this.metrics.pageFaults++

          // Verificar si la página faulteada ya estuvo en RAM y fue enviada al disco.
          const diskIdx = this.disk.findIndex(d => d.processId === processId && d.vpn === vpn)
          const isSwapIn = diskIdx !== -1

          let pfn
          let victimVpn = null

          const freeFrame = this.physicalMemory.find(f => f.processId === null)

          if (freeFrame) {
            // 6b. Hay un marco libre — usarlo directamente.
            pfn = freeFrame.frameId
            freeFrame.processId = processId
            freeFrame.vpn = vpn
            freeFrame.dirty = false
            freeFrame.loadedAt = this.tick
            freeFrame.lastAccessed = this.tick
          } else {
            // 6b. Sin marcos libres — elegir víctima según algoritmo.
            const victim = this._selectVictim()
            victimVpn = victim.vpn
            pfn = victim.frameId

            // Invalidar la víctima en la tabla de páginas de su proceso.
            const victimProcess = this.processes.find(p => p.id === victim.processId)
            if (victimProcess) {
              const victimPage = victimProcess.pageTable.find(p => p.vpn === victim.vpn)
              if (victimPage) {
                victimPage.valid = false
                victimPage.pfn = null
                victimPage.dirty = false
              }
            }

            // Enviar la víctima al disco (swap-out).
            const existingDiskIdx = this.disk.findIndex(
              d => d.processId === victim.processId && d.vpn === victim.vpn,
            )
            if (existingDiskIdx !== -1) this.disk.splice(existingDiskIdx, 1)
            this.disk.push({
              processId: victim.processId,
              vpn: victim.vpn,
              dirty: victim.dirty,
              evictedAt: this.tick,
            })
            this.metrics.swapOuts++

            // Eliminar cualquier entrada TLB de la víctima.
            this.tlb = this.tlb.filter(
              e => !(e.processId === victim.processId && e.vpn === victim.vpn),
            )

            // Reutilizar el marco físico.
            victim.processId = processId
            victim.vpn = vpn
            victim.dirty = false
            victim.loadedAt = this.tick
            victim.lastAccessed = this.tick
          }

          // 6c-6d. Actualizar la tabla de páginas del proceso actual.
          pageEntry.valid = true
          pageEntry.pfn = pfn
          pageEntry.dirty = false

          // Remover del disco si era un swap-in.
          if (isSwapIn) {
            this.disk.splice(diskIdx, 1)
            this.metrics.swapIns++
          }

          // 6e. Cargar la nueva traducción en la TLB.
          this._tlbInsert(processId, vpn, pfn)

          // Paso 8: dirty si es escritura
          if (operation === 'W') {
            pageEntry.dirty = true
            this.physicalMemory[pfn].dirty = true
          }

          // Paso 9
          this.executionLog.push({
            tick: this.tick, processId, virtualAddress, operation, vpn, offset,
            result: 'PAGE_FAULT',
            frameAssigned: pfn,
            victimVpn,
            swapIn: isSwapIn,
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

      // ── Paso 10: incrementar tick ──────────────────────────────────────
      this.tick++

      // ── Paso 11: recalcular hit rate ───────────────────────────────────
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
        _vpn: null, _offset: null, _isContextSwitch: false, _permissionError: null,
        _tlbHit: false, _pageValid: false, _pfn: null,
        _isSwapIn: false, _diskIdx: -1, _freeFrame: null,
        _victim: null, _victimVpn: null, _victimProcessId: null, _victimDirty: false,
      }
    },

    // Crea un proceso con una tabla de páginas vacía (todas las páginas en disco).
    // permissions puede ser 'R' o 'RW', o un array por página.
    addProcess(name, pageCount, permissions = 'RW') {
      const id = this._nextProcessId++
      const pageTable = Array.from({ length: pageCount }, (_, i) => ({
        vpn: i,
        pfn: null,
        valid: false,
        permissions: Array.isArray(permissions) ? (permissions[i] ?? 'RW') : permissions,
        dirty: false,
      }))
      this.processes.push({ id, name, pageTable })
      // Todas las páginas empiezan en disco — demand paging.
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
