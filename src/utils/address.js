// Divide una dirección virtual en VPN y offset.
// Con páginas de 4 KB: los 12 bits bajos son el offset, el resto es el VPN.
export function parseAddress(virtualAddress) {
  const addr = parseInt(virtualAddress, 16)
  return { vpn: addr >>> 12, offset: addr & 0xFFF }
}
