import { parseAddress } from './address'
import { selectVictim } from './memory'

// Recibe un snapshot del estado necesario para pre-computar los pasos,
// y devuelve { steps, meta } sin mutar nada.
//
// steps: array de objetos { id, label, detail, type } para el stepper.
// meta:  valores pre-computados (vpn, pfn, víctima, etc.) que _applyStep necesita.
export function buildSteps({
  processId, virtualAddress, operation,
  currentProcessId, processes, tlb, physicalMemory, disk, config, tick,
}) {
  const steps = []

  const meta = {
    _processId: processId,
    _virtualAddress: virtualAddress,
    _operation: operation,
    _isContextSwitch: processId !== currentProcessId,
    _vpn: null,
    _offset: null,
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
  }

  // Paso 1 — cambio de contexto
  if (meta._isContextSwitch) {
    steps.push({
      id: 'CONTEXT_SWITCH',
      label: 'Cambio de contexto',
      detail: `Proceso ${currentProcessId ?? '–'} → proceso ${processId}. TLB se vaciará.`,
      type: 'switch',
    })
  }

  // Paso 2 — parsear dirección
  const { vpn, offset } = parseAddress(virtualAddress)
  meta._vpn = vpn
  meta._offset = offset
  steps.push({
    id: 'PARSE',
    label: 'Parsear dirección',
    detail: `${virtualAddress} → VPN ${vpn}, offset 0x${offset.toString(16).toUpperCase().padStart(3, '0')}`,
    type: 'info',
  })

  // Paso 3 — verificar permisos
  const process = processes.find(p => p.id === processId)
  const pageEntry = process?.pageTable.find(p => p.vpn === vpn)

  if (!process) {
    meta._permissionError = `Proceso ${processId} no encontrado.`
  } else if (!pageEntry) {
    meta._permissionError = `VPN ${vpn} no existe en la tabla de páginas del proceso ${processId}.`
  } else if (operation === 'W' && pageEntry.permissions === 'R') {
    meta._permissionError = `Acceso denegado: VPN ${vpn} es de solo lectura (proceso ${processId}).`
  }

  if (meta._permissionError) {
    steps.push({ id: 'PERMISSIONS', label: 'Verificar permisos', detail: meta._permissionError, type: 'error' })
    return { steps, meta }
  }

  steps.push({
    id: 'PERMISSIONS',
    label: 'Verificar permisos',
    detail: `VPN ${vpn}: permisos OK (${pageEntry.permissions}${operation === 'W' ? ', escritura permitida' : ''}).`,
    type: 'hit',
  })

  // Paso 4 — buscar en TLB
  const tlbEntry = tlb.find(e => e.processId === processId && e.vpn === vpn) ?? null
  meta._tlbHit = !!tlbEntry

  if (meta._tlbHit) {
    meta._pfn = tlbEntry.pfn
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

    meta._pageValid = pageEntry.valid

    if (pageEntry.valid) {
      meta._pfn = pageEntry.pfn
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

      const diskIdx = disk.findIndex(d => d.processId === processId && d.vpn === vpn)
      meta._isSwapIn = diskIdx !== -1
      meta._diskIdx = diskIdx
      steps.push({
        id: 'CHECK_DISK',
        label: 'Verificar disco',
        detail: meta._isSwapIn
          ? `VPN ${vpn} encontrada en disco → swap-in (fue desalojada anteriormente).`
          : `VPN ${vpn} no está en disco → carga inicial (primera vez en RAM).`,
        type: meta._isSwapIn ? 'hit' : 'info',
      })

      const freeFrame = physicalMemory.find(f => f.processId === null)
      if (freeFrame) {
        meta._freeFrame = freeFrame.frameId
        meta._pfn = freeFrame.frameId
        steps.push({
          id: 'SELECT_FRAME_FREE',
          label: 'Seleccionar marco',
          detail: `Marco libre disponible: F${freeFrame.frameId}. No se necesita desalojar ninguna página.`,
          type: 'info',
        })
      } else {
        const victim = selectVictim(physicalMemory, config.algorithm)
        meta._victim = victim.frameId
        meta._victimVpn = victim.vpn
        meta._victimProcessId = victim.processId
        meta._victimDirty = victim.dirty
        meta._pfn = victim.frameId
        const victimProcName = processes.find(p => p.id === victim.processId)?.name ?? `P${victim.processId}`
        steps.push({
          id: 'SELECT_FRAME_VICTIM',
          label: `Seleccionar víctima (${config.algorithm})`,
          detail: `RAM llena. ${config.algorithm}: víctima VPN ${victim.vpn} de ${victimProcName} en marco F${victim.frameId}${victim.dirty ? ' (dirty → requiere escritura a disco)' : ' (clean → descarte gratis)'}.`,
          type: 'fault',
        })
        steps.push({
          id: 'EVICT',
          label: 'Desalojar víctima',
          detail: `Invalidar VPN ${victim.vpn} en tabla de páginas, eliminar de TLB, enviar al disco ("swap out")${victim.dirty ? ' (dirty)' : ' (clean)'}.`,
          type: victim.dirty ? 'fault' : 'miss',
        })
      }

      steps.push({
        id: 'LOAD_PAGE',
        label: 'Cargar página en RAM',
        detail: `Asignar marco F${meta._pfn} a VPN ${vpn}. Actualizar tabla de páginas (valid=true, pfn=${meta._pfn}).`,
        type: 'info',
      })
      steps.push({
        id: 'UPDATE_TLB',
        label: 'Actualizar TLB',
        detail: `Insertar VPN ${vpn} → marco ${meta._pfn} en TLB.${operation === 'W' ? ' Marcar dirty.' : ''}`,
        type: 'info',
      })
    }
  }

  steps.push({
    id: 'FINALIZE',
    label: 'Finalizar instrucción',
    detail: `Registrar resultado en log, incrementar tick (→ t${tick + 1}), recalcular hit rate.`,
    type: 'info',
  })

  return { steps, meta }
}
