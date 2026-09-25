import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { NODE_COLORS, type GraphNode } from './networkData'

// Deterministic PRNG so the sky looks the same on every visit
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let glowTexture: THREE.Texture | null = null
export function getGlowTexture() {
  if (glowTexture) return glowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  glowTexture = new THREE.CanvasTexture(canvas)
  return glowTexture
}

function cloudTexture(seed: number) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = mulberry32(seed)
  for (let i = 0; i < 70; i++) {
    const angle = rand() * Math.PI * 2
    const dist = Math.pow(rand(), 1.6) * size * 0.32
    const x = size / 2 + Math.cos(angle) * dist
    const y = size / 2 + Math.sin(angle) * dist * 0.7
    const r = size * (0.06 + rand() * 0.2)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${0.05 + rand() * 0.08})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  return new THREE.CanvasTexture(canvas)
}

/** Distant stars and nebula clouds that sit behind the graph */
export function createSky(): THREE.Group {
  const sky = new THREE.Group()
  sky.name = 'cosmos-sky'
  const rand = mulberry32(20251)

  const starLayers = [
    { count: 7000, size: 1.1, minR: 5000, maxR: 9000 },
    { count: 1600, size: 2, minR: 4000, maxR: 8000 },
    { count: 220, size: 3.4, minR: 3500, maxR: 7000 },
  ]
  const tints = [new THREE.Color('#ffffff'), new THREE.Color('#cfe3ff'), new THREE.Color('#ffe8cf'), new THREE.Color('#d9d0ff')]
  for (const layer of starLayers) {
    const positions = new Float32Array(layer.count * 3)
    const colors = new Float32Array(layer.count * 3)
    for (let i = 0; i < layer.count; i++) {
      const u = rand() * 2 - 1
      const theta = rand() * Math.PI * 2
      const r = layer.minR + rand() * (layer.maxR - layer.minR)
      const s = Math.sqrt(1 - u * u)
      positions.set([r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)], i * 3)
      const c = tints[Math.floor(rand() * tints.length)].clone().multiplyScalar(0.45 + rand() * 0.55)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
      size: layer.size,
      sizeAttenuation: false,
      vertexColors: true,
      map: getGlowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
    sky.add(new THREE.Points(geometry, material))
  }

  const nebulae = [
    { color: '#7c3aed', pos: [-2600, 900, -3200], scale: 5200, opacity: 0.22 },
    { color: '#2563eb', pos: [3000, -700, -2600], scale: 4800, opacity: 0.2 },
    { color: '#db2777', pos: [600, 2200, -3800], scale: 4200, opacity: 0.14 },
    { color: '#0d9488', pos: [-1800, -2400, 2600], scale: 4600, opacity: 0.13 },
    { color: '#9333ea', pos: [2800, 1600, 3000], scale: 5000, opacity: 0.15 },
    { color: '#1d4ed8', pos: [-3400, 300, 2000], scale: 4000, opacity: 0.14 },
  ]
  nebulae.forEach((n, i) => {
    const material = new THREE.SpriteMaterial({
      map: cloudTexture(i + 7),
      color: n.color,
      transparent: true,
      opacity: n.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
    const sprite = new THREE.Sprite(material)
    sprite.position.set(n.pos[0], n.pos[1], n.pos[2])
    sprite.scale.set(n.scale, n.scale * 0.75, 1)
    material.rotation = rand() * Math.PI
    sky.add(sprite)
  })

  return sky
}

export function createOrbitRings(levels: number, spacing: number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'cosmos-orbits'
  for (let level = 1; level <= levels; level++) {
    const points = new THREE.EllipseCurve(0, 0, level * spacing, level * spacing).getPoints(160)
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({
      color: '#93c5fd',
      transparent: true,
      opacity: 0.16 - level * 0.02,
      dashSize: 6,
      gapSize: 5,
      depthWrite: false,
    })
    const ring = new THREE.LineLoop(geometry, material)
    ring.computeLineDistances()
    ring.rotation.x = Math.PI / 2
    group.add(ring)
  }
  return group
}

const sphereGeometry = new THREE.SphereGeometry(1, 24, 16)
const ringGeometry = new THREE.RingGeometry(1.5, 2.1, 64)

export interface NodeVisual {
  group: THREE.Group
  core: THREE.MeshBasicMaterial
  halo: THREE.SpriteMaterial
  haloOpacity: number
  ring?: THREE.MeshBasicMaterial
  label?: CSS2DObject
}

/** A glowing body: category = sun, region = ringed planet, everything else = star */
export function createNodeVisual(node: GraphNode): NodeVisual {
  const color = new THREE.Color(NODE_COLORS[node.type])
  const group = new THREE.Group()

  const core = new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color('#ffffff'), 0.15), transparent: true })
  const mesh = new THREE.Mesh(sphereGeometry, core)
  mesh.scale.setScalar(node.r)
  group.add(mesh)

  const haloOpacity = { category: 0.6, region: 0.4, province: 0.25, organization: 0.35, contractor: 0.35 }[node.type]
  const halo = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity: haloOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const haloSprite = new THREE.Sprite(halo)
  const haloScale = node.r * (node.type === 'category' ? 5 : node.type === 'region' ? 4 : 3.2)
  haloSprite.scale.set(haloScale, haloScale, 1)
  group.add(haloSprite)

  const visual: NodeVisual = { group, core, halo, haloOpacity }

  if (node.type === 'region') {
    const ring = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ringMesh = new THREE.Mesh(ringGeometry, ring)
    ringMesh.scale.setScalar(node.r)
    const rand = mulberry32(node.name.length * 97 + node.rank)
    ringMesh.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9, 0)
    group.add(ringMesh)
    visual.ring = ring
  }

  return visual
}

const LABEL_COLORS: Record<GraphNode['type'], string> = {
  category: '#fde68a',
  region: '#e9d5ff',
  province: '#d1fae5',
  organization: '#fecdd3',
  contractor: '#e0f2fe',
}

/** HTML label rendered by CSS2DRenderer so it stays crisp and unaffected by bloom */
export function createLabel(node: GraphNode): CSS2DObject {
  const el = document.createElement('div')
  el.textContent = node.name.length > 48 ? `${node.name.slice(0, 46)}…` : node.name
  const big = node.type === 'category' || node.type === 'region'
  Object.assign(el.style, {
    color: LABEL_COLORS[node.type],
    font: `${big ? 600 : 500} ${node.type === 'category' ? 13 : big ? 12 : 11}px Figtree, system-ui, sans-serif`,
    letterSpacing: big ? '0.04em' : '0.01em',
    textTransform: big ? 'uppercase' : 'none',
    textShadow: '0 0 6px rgba(2,3,10,0.95), 0 0 2px rgba(2,3,10,1)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transform: 'translateY(-14px)',
    transition: 'opacity 200ms',
  })
  const label = new CSS2DObject(el)
  label.center.set(0.5, 1)
  label.position.set(0, node.r * 1.1, 0)
  return label
}
