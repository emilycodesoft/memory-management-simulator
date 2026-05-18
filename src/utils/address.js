// Divide una dirección virtual en VPN y offset.
// Con páginas de 4 KB: los 12 bits bajos son el offset, el resto es el VPN.
export function parseAddress(virtualAddress) {
  const addr = parseInt(virtualAddress, 16)
  return { vpn: addr >>> 12, offset: addr & 0xFFF }
}

// Divide un offset dentro de un segmento en página-en-segmento y byte-offset.
// pageInSegment identifica qué página del segmento se accede; byteOffset es
// el desplazamiento dentro de esa página (siempre 0–4095).
export function parseSegmentOffset(hexOffset) {
  const addr = parseInt(hexOffset, 16)
  return { pageInSegment: addr >>> 12, byteOffset: addr & 0xFFF }
}
