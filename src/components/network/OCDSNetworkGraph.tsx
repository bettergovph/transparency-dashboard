import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d'
import * as THREE from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Orbit, Search, X, Eye, EyeOff, ZoomIn, ZoomOut, Maximize2, RotateCcw,
  Pause, Play, ChevronRight, ArrowUpRight, Sparkles, Telescope, PanelLeftOpen, PanelLeftClose, Minimize2,
} from 'lucide-react'
import Navigation from '../Navigation'
import { createLabel, createNodeVisual, createOrbitRings, createSky, type NodeVisual } from './cosmos'
import {
  NODE_COLORS, NODE_LABELS, NODE_SINGULAR, NODE_TYPES,
  detailPath, formatPeso, linkEndId, loadCategoryGraph, loadNetworkIndex,
  type Graph, type GraphLink, type GraphNode, type NetworkIndex, type NodeType,
} from './networkData'

type FG = ForceGraphMethods<GraphNode, GraphLink>

const labelRenderer = [new CSS2DRenderer()]

const DENSITY_OPTIONS = [50, 100, 200, 400]
const ORBIT_SPACING = 110
const LINK_DISTANCE: Record<NodeType, number> = {
  category: 90, region: 90, province: 45, organization: 55, contractor: 30,
}

/** Brightest bodies keep their names visible even when nothing is selected */
function isLandmark(n: GraphNode) {
  switch (n.type) {
    case 'category': return n.rank < 10
    case 'region': return n.rank < 3
    case 'province': return n.rank < 3
    case 'organization': return n.rank < 5
    case 'contractor': return n.rank < 5
  }
}

function hexToRgba(hex: string, alpha: number) {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const panel = 'bg-[#070a1a]/75 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_0_60px_-20px_rgba(56,189,248,0.45)]'
const eyebrow = 'font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300/70'

const CRUMB_CHARS = 14
const CURRENT_CRUMB_CHARS = 24
const TRAIL_CRUMBS = 3

const shorten = (text: string, max = CRUMB_CHARS) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

interface Crumb {
  key: string
  /** Full name, shown on hover */
  title: string
  kind?: string
  color?: string
  /** Body to fly to; omitted for the universe and category roots */
  node?: GraphNode
}

function Breadcrumbs({ crumbs, onSelect }: { crumbs: Crumb[]; onSelect: (crumb: Crumb) => void }) {
  // Universe and category stay pinned; a long trail keeps only its deepest steps
  const roots = crumbs.filter(c => !c.node)
  const steps = crumbs.filter(c => c.node)
  const shown: (Crumb | { key: string; hidden: Crumb[] })[] = steps.length > TRAIL_CRUMBS
    ? [...roots, { key: 'gap', hidden: steps.slice(0, -TRAIL_CRUMBS) }, ...steps.slice(-TRAIL_CRUMBS)]
    : crumbs
  return (
    <nav aria-label="Breadcrumb" className="pointer-events-auto max-w-full">
      <ol className="flex items-center gap-0.5 rounded-full border border-white/10 bg-[#070a1a]/60 backdrop-blur-md px-1.5 py-1 shadow-[0_0_30px_-12px_rgba(56,189,248,0.6)] overflow-hidden">
        {shown.map((crumb, i) => {
          const last = i === shown.length - 1
          return (
            <li key={crumb.key} className="flex items-center gap-0.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" aria-hidden />}
              {'hidden' in crumb ? (
                <span className="px-1.5 text-[11px] text-slate-500" title={crumb.hidden.map(c => c.title).join(' › ')}>…</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(crumb)}
                  disabled={last}
                  aria-current={last ? 'page' : undefined}
                  title={crumb.kind ? `${crumb.kind}: ${crumb.title}` : crumb.title}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] leading-5 whitespace-nowrap transition-colors ${last
                    ? 'bg-white/10 text-white font-medium cursor-default'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  {crumb.color && (
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: crumb.color, boxShadow: `0 0 6px ${crumb.color}` }} />
                  )}
                  {shorten(crumb.title, last ? CURRENT_CRUMB_CHARS : CRUMB_CHARS)}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function HudButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10">
      {children}
    </button>
  )
}

export default function OCDSNetworkGraph() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const categorySlug = searchParams.get('category')

  const graphRef = useRef<FG | undefined>(undefined)
  const pageRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const visualsRef = useRef(new Map<string, NodeVisual>())
  const sceneReadyRef = useRef(false)

  const [index, setIndex] = useState<NetworkIndex | null>(null)
  const [graph, setGraph] = useState<Graph | null>(null)
  // Which graph is on screen / which request failed, keyed by category slug ('' = overview)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const [density, setDensity] = useState(200)
  const [visibleTypes, setVisibleTypes] = useState<Record<NodeType, boolean>>({
    category: true, region: true, province: true, organization: true, contractor: true,
  })
  const [orbits, setOrbits] = useState(true)
  const [autoRotate, setAutoRotate] = useState(() => !prefersReducedMotion())
  // The path clicked through the graph; its last entry is the selected body
  const [trail, setTrail] = useState<GraphNode[]>([])
  const selected = trail.length ? trail[trail.length - 1] : null
  const [fullView, setFullView] = useState(false)
  const [hovered, setHovered] = useState<GraphNode | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [showCatalog, setShowCatalog] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [nodeQuery, setNodeQuery] = useState('')

  const currentCategory = useMemo(
    () => index?.categories.find(c => c.slug === categorySlug) ?? null,
    [index, categorySlug]
  )
  const slugByName = useMemo(
    () => new Map(index?.categories.map(c => [c.name, c.slug]) ?? []),
    [index]
  )
  const useOrbits = orbits && !!categorySlug
  const requestKey = categorySlug ?? ''
  const unknownCategory = !!index && !!categorySlug && !currentCategory
  const error = unknownCategory
    ? `No category "${categorySlug}" in the star map`
    : failure && (failure.key === requestKey || failure.key === 'index') ? failure.message : null
  const loading = !error && loadedKey !== requestKey

  // Load catalogue once, then the graph for the chosen category (or the overview)
  useEffect(() => {
    loadNetworkIndex().then(setIndex).catch(err => {
      setFailure({ key: 'index', message: err instanceof Error ? err.message : 'Failed to load network data' })
    })
  }, [])

  useEffect(() => {
    if (!index || unknownCategory) return
    let cancelled = false
    const request = categorySlug ? loadCategoryGraph(categorySlug) : loadNetworkIndex().then(i => i.overview)
    request
      .then(g => {
        if (cancelled) return
        visualsRef.current.forEach(v => {
          v.core.dispose()
          v.halo.dispose()
          v.ring?.dispose()
          v.label?.element.remove()
        })
        visualsRef.current.clear()
        setTrail([])
        setHovered(null)
        setNodeQuery('')
        setGraph(g)
        setLoadedKey(requestKey)
        graphRef.current?.cameraPosition({ x: 0, y: 0, z: 3200 }, { x: 0, y: 0, z: 0 }, 0)
      })
      .catch(err => {
        if (!cancelled) setFailure({ key: requestKey, message: err instanceof Error ? err.message : 'Failed to load category' })
      })
    return () => { cancelled = true }
  }, [index, categorySlug, requestKey, unknownCategory])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Visible slice of the graph: density limits + layer toggles
  const view = useMemo(() => {
    if (!graph) return null
    const orgLimit = Math.max(30, Math.round(density * 0.6))
    const keep = new Set<string>()
    for (const n of graph.nodes) {
      if (!visibleTypes[n.type]) continue
      if (n.type === 'contractor' && n.rank >= density) continue
      if (n.type === 'organization' && n.rank >= orgLimit) continue
      keep.add(n.id)
    }
    const links = graph.links.filter(l => keep.has(linkEndId(l.source)) && keep.has(linkEndId(l.target)))
    const linked = new Set<string>()
    for (const l of links) {
      linked.add(linkEndId(l.source))
      linked.add(linkEndId(l.target))
    }
    const nodes = graph.nodes.filter(n => keep.has(n.id) && (linked.has(n.id) || n.type === 'category' || n.type === 'region'))
    return { nodes, links }
  }, [graph, density, visibleTypes])

  const nodeById = useMemo(() => new Map(graph?.nodes.map(n => [n.id, n]) ?? []), [graph])

  // Links point outward from the category: category -> region -> province -> department -> contractor
  const graphLinks = useMemo(() => {
    const adjacent = new Map<string, Set<string>>()
    const parents = new Map<string, { id: string; value: number }[]>()
    for (const l of graph?.links ?? []) {
      const s = linkEndId(l.source)
      const t = linkEndId(l.target)
      if (!adjacent.has(s)) adjacent.set(s, new Set())
      if (!adjacent.has(t)) adjacent.set(t, new Set())
      adjacent.get(s)!.add(t)
      adjacent.get(t)!.add(s)
      if (!parents.has(t)) parents.set(t, [])
      parents.get(t)!.push({ id: s, value: l.value })
    }
    return { adjacent, parents }
  }, [graph])

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const l of view?.links ?? []) {
      const s = linkEndId(l.source)
      const t = linkEndId(l.target)
      if (!map.has(s)) map.set(s, new Set())
      if (!map.has(t)) map.set(t, new Set())
      map.get(s)!.add(t)
      map.get(t)!.add(s)
    }
    return map
  }, [view])

  const flowLinks = useMemo(() => {
    const top = [...(view?.links ?? [])].sort((a, b) => b.value - a.value).slice(0, 45)
    return new Set(top)
  }, [view])

  const highlight = useMemo(() => {
    if (!selected) return null
    return new Set([selected.id, ...(neighbors.get(selected.id) ?? [])])
  }, [selected, neighbors])

  // One-time scene dressing: star field, nebulae, fog and bloom
  useEffect(() => {
    const fg = graphRef.current
    if (!fg || !view || sceneReadyRef.current || !size.width) return
    sceneReadyRef.current = true
    const scene = fg.scene()
    scene.add(createSky())
    scene.fog = new THREE.FogExp2('#04030d', 0.00018)
    const camera = fg.camera() as THREE.PerspectiveCamera
    camera.far = 40000
    camera.updateProjectionMatrix()
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.85, 0.5, 0.2)
    fg.postProcessingComposer().addPass(bloom)
  }, [view, size.width, size.height])

  useEffect(() => {
    const controls = graphRef.current?.controls() as OrbitControls | undefined
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.35
    controls.enableDamping = true
    controls.dampingFactor = 0.08
  }, [autoRotate, view])

  // Force tuning per layout
  useEffect(() => {
    const fg = graphRef.current
    if (!fg || !view) return
    fg.d3Force('charge')?.strength(useOrbits ? -25 : categorySlug ? -40 : -70)
    fg.d3Force('link')?.distance((l: GraphLink) => {
      const target = typeof l.target === 'string' ? nodeById.get(l.target) : l.target
      return LINK_DISTANCE[target?.type ?? 'contractor']
    })
  }, [view, useOrbits, categorySlug, nodeById])

  // Faint orbit guides for each shell in the radial layout
  useEffect(() => {
    const fg = graphRef.current
    if (!fg || !view || !useOrbits) return
    const rings = createOrbitRings(4, ORBIT_SPACING)
    fg.scene().add(rings)
    return () => {
      fg.scene().remove(rings)
      rings.traverse(o => {
        if (o instanceof THREE.Line) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
    }
  }, [view, useOrbits])

  const nodeThreeObject = useCallback((node: GraphNode) => {
    let visual = visualsRef.current.get(node.id)
    if (!visual) {
      visual = createNodeVisual(node)
      if (isLandmark(node)) {
        visual.label = createLabel(node)
        visual.group.add(visual.label)
      }
      visualsRef.current.set(node.id, visual)
    }
    return visual.group
  }, [])

  // Dim everything outside the selection's neighbourhood and reveal their names
  useEffect(() => {
    for (const node of view?.nodes ?? []) {
      const visual = visualsRef.current.get(node.id)
      if (!visual) continue
      const lit = !highlight || highlight.has(node.id)
      visual.core.opacity = lit ? 1 : 0.12
      visual.halo.opacity = lit ? visual.haloOpacity * (highlight ? 1.25 : 1) : 0.04
      if (visual.ring) visual.ring.opacity = lit ? 0.5 : 0.06

      const isFocus = node.id === selected?.id || node.id === hovered?.id
      const showLabel = isFocus || (highlight ? lit && (highlight.size <= 60 || isLandmark(node)) : isLandmark(node))
      if (showLabel && !visual.label) {
        visual.label = createLabel(node)
        visual.group.add(visual.label)
      }
      if (visual.label) {
        visual.label.visible = showLabel
        visual.label.element.style.opacity = isFocus ? '1' : '0.8'
      }
    }
  }, [view, highlight, selected, hovered])

  const isFocusLink = useCallback((l: GraphLink) => {
    if (!selected) return false
    return linkEndId(l.source) === selected.id || linkEndId(l.target) === selected.id
  }, [selected])

  const targetColor = useCallback((l: GraphLink) => {
    const target = typeof l.target === 'string' ? nodeById.get(l.target) : l.target
    return NODE_COLORS[target?.type ?? 'contractor']
  }, [nodeById])

  const linkColor = useCallback((l: GraphLink) => {
    const alpha = !selected ? 0.2 : isFocusLink(l) ? 0.9 : 0.025
    return hexToRgba(targetColor(l), alpha)
  }, [selected, isFocusLink, targetColor])

  const linkWidth = useCallback((l: GraphLink) => (isFocusLink(l) ? 0.7 : 0), [isFocusLink])

  const linkParticles = useCallback((l: GraphLink) => {
    if (selected) return isFocusLink(l) ? 3 : 0
    return flowLinks.has(l) ? 1 : 0
  }, [selected, isFocusLink, flowLinks])

  const flyTo = useCallback((node: GraphNode) => {
    const fg = graphRef.current
    if (!fg) return
    const { x = 0, y = 0, z = 0 } = node
    const distance = 90 + node.r * 12
    const hyp = Math.hypot(x, y, z)
    const position = hyp < 1
      ? { x: 0, y: distance * 0.3, z: distance * 1.6 }
      : { x: x * (1 + distance / hyp), y: y * (1 + distance / hyp), z: z * (1 + distance / hyp) }
    fg.cameraPosition(position, { x, y, z }, 1400)
  }, [])

  /** Follow the biggest-spending parent links back up to the top of the hierarchy */
  const pathFromRoot = useCallback((node: GraphNode) => {
    const path = [node]
    const seen = new Set([node.id])
    let current = node
    while (path.length < 8) {
      const parent = [...(graphLinks.parents.get(current.id) ?? [])]
        .sort((a, b) => b.value - a.value)
        .map(p => nodeById.get(p.id))
        .find(p => p && !seen.has(p.id))
      if (!parent) break
      path.unshift(parent)
      seen.add(parent.id)
      current = parent
    }
    return path
  }, [graphLinks, nodeById])

  const selectNode = useCallback((node: GraphNode) => {
    setTrail(prev => {
      const at = prev.findIndex(n => n.id === node.id)
      if (at >= 0) return prev.slice(0, at + 1)
      const last = prev[prev.length - 1]
      if (last && graphLinks.adjacent.get(last.id)?.has(node.id)) return [...prev, node]
      return pathFromRoot(node)
    })
    flyTo(node)
  }, [flyTo, graphLinks, pathFromRoot])

  const clearSelection = useCallback(() => {
    setTrail([])
    graphRef.current?.zoomToFit(1200, 60)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // First Escape clears the selection, the next one leaves full view
      setTrail(prev => {
        if (!prev.length) setFullView(false)
        return []
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Warp in once the layout has spread out (the engine can report "stopped" before it has)
  useEffect(() => {
    if (!graph) return
    let timer: ReturnType<typeof setTimeout>
    const tryFit = (attempt: number) => {
      const fg = graphRef.current
      const box = fg?.getGraphBbox()
      const span = box ? Math.max(box.x[1] - box.x[0], box.y[1] - box.y[0], box.z[1] - box.z[0]) : 0
      if (fg && (span > 60 || attempt > 6)) fg.zoomToFit(2200, 40)
      else timer = setTimeout(() => tryFit(attempt + 1), 500)
    }
    timer = setTimeout(() => tryFit(0), 1200)
    return () => clearTimeout(timer)
  }, [graph])

  const zoom = useCallback((factor: number) => {
    const fg = graphRef.current
    if (!fg) return
    const { x, y, z } = fg.camera().position
    fg.cameraPosition({ x: x * factor, y: y * factor, z: z * factor }, undefined, 500)
  }, [])

  // Full view hides the site header and, where supported, takes over the whole screen
  const toggleFullView = useCallback(() => {
    if (fullView) {
      setFullView(false)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    } else {
      setFullView(true)
      pageRef.current?.requestFullscreen?.().catch(() => {})
    }
  }, [fullView])

  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setFullView(false) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const openCategory = useCallback((slug: string | null) => {
    setSearchParams(slug ? { category: slug } : {})
  }, [setSearchParams])

  const connections = useMemo(() => {
    if (!selected || !graph) return []
    const byType = new Map<NodeType, { node: GraphNode; value: number; count: number }[]>()
    for (const l of graph.links) {
      const s = linkEndId(l.source)
      const t = linkEndId(l.target)
      const otherId = s === selected.id ? t : t === selected.id ? s : null
      const other = otherId ? nodeById.get(otherId) : undefined
      if (!other) continue
      if (!byType.has(other.type)) byType.set(other.type, [])
      byType.get(other.type)!.push({ node: other, value: l.value, count: l.count })
    }
    return NODE_TYPES.filter(t => byType.has(t)).map(type => ({
      type,
      items: byType.get(type)!.sort((a, b) => b.value - a.value),
    }))
  }, [selected, graph, nodeById])

  const catalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    return (index?.categories ?? []).filter(c => !q || c.name.toLowerCase().includes(q))
  }, [index, catalogQuery])
  const maxCategoryTotal = index?.categories[0]?.total ?? 1

  const nodeMatches = useMemo(() => {
    const q = nodeQuery.trim().toLowerCase()
    if (q.length < 2 || !view) return []
    return view.nodes.filter(n => n.name.toLowerCase().includes(q)).sort((a, b) => b.val - a.val).slice(0, 8)
  }, [nodeQuery, view])

  const counts = useMemo(() => {
    const c: Partial<Record<NodeType, number>> = {}
    for (const n of view?.nodes ?? []) c[n.type] = (c[n.type] ?? 0) + 1
    return c
  }, [view])

  const crumbs = useMemo(() => {
    const list: Crumb[] = [{
      key: 'universe',
      title: 'Universe',
    }]
    if (currentCategory) {
      list.push({
        key: 'category',
        title: currentCategory.name,
        color: NODE_COLORS.category,
      })
    }
    for (const node of trail) {
      if (node.type === 'category' && node.name === currentCategory?.name) continue
      list.push({
        key: node.id,
        title: node.name,
        kind: NODE_SINGULAR[node.type],
        color: NODE_COLORS[node.type],
        node,
      })
    }
    return list
  }, [trail, currentCategory])

  const onCrumb = useCallback((crumb: Crumb) => {
    if (crumb.node) selectNode(crumb.node)
    else if (crumb.key === 'universe' && categorySlug) openCategory(null)
    else clearSelection()
  }, [categorySlug, openCategory, clearSelection, selectNode])

  const presentTypes = useMemo(() => NODE_TYPES.filter(t => graph?.nodes.some(n => n.type === t)), [graph])
  const focusValue = currentCategory?.total ?? index?.totals.value ?? 0
  const focusCount = currentCategory?.count ?? index?.totals.contracts ?? 0

  return (
    <div ref={pageRef} className={`flex flex-col bg-[#02030a] overflow-hidden ${fullView ? 'fixed inset-0 z-50' : 'h-[100dvh]'}`}>
      <Helmet>
        <title>{currentCategory ? `${currentCategory.name} - ` : ''}Procurement Cosmos - PhilGEPS Network Graph</title>
        <meta name="description" content="Explore Philippine government procurement as a 3D network of contractors, departments, provinces, regions and business categories." />
        <link rel="canonical" href="https://philgeps.bettergov.ph/universe" />
      </Helmet>
      {!fullView && <Navigation />}

      <main
        ref={containerRef}
        className="relative flex-1 min-h-0 select-none"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        style={{ cursor: hovered ? 'pointer' : 'grab' }}
      >
        {view && size.width > 0 && (
          <ForceGraph3D<GraphNode, GraphLink>
            ref={graphRef}
            graphData={view}
            width={size.width}
            height={size.height}
            backgroundColor="#02030a"
            controlType="orbit"
            extraRenderers={labelRenderer}
            showNavInfo={false}
            nodeLabel={() => ''}
            nodeThreeObject={nodeThreeObject}
            onNodeClick={selectNode}
            onNodeHover={node => setHovered(node ?? null)}
            onBackgroundClick={() => setTrail([])}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkOpacity={1}
            linkDirectionalParticles={linkParticles}
            linkDirectionalParticleWidth={l => (isFocusLink(l) ? 1.6 : 1.1)}
            linkDirectionalParticleColor={targetColor}
            linkDirectionalParticleSpeed={0.004}
            dagMode={useOrbits ? 'radialout' : undefined}
            dagLevelDistance={ORBIT_SPACING}
            onDagError={() => {}}
            warmupTicks={40}
            cooldownTicks={180}
            d3AlphaDecay={0.025}
            d3VelocityDecay={0.35}
          />
        )}

        {/* Vignette to sink the edges into deep space */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,3,10,0.85)_100%)]" />

        {/* Title + breadcrumb trail */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[5] flex flex-col items-center px-4">
          <div className="hidden md:block text-center w-full max-w-xl">
            <p className={eyebrow}>PhilGEPS · Open Contracting</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-white tracking-tight drop-shadow-[0_0_18px_rgba(125,211,252,0.45)] truncate">
              {currentCategory ? currentCategory.name : 'Procurement Cosmos'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {formatPeso(focusValue)} · {focusCount.toLocaleString()} contracts
              {currentCategory && ` · ${currentCategory.contractors.toLocaleString()} contractors`}
            </p>
          </div>
          <div className="mt-14 md:mt-3 max-w-full md:max-w-[42rem]">
            <Breadcrumbs crumbs={crumbs} onSelect={onCrumb} />
          </div>
        </div>

        {/* Catalogue of category systems */}
        <div className="absolute top-4 left-4 bottom-24 flex flex-col items-start gap-2 z-10 max-w-[calc(100%-2rem)]">
          <button
            onClick={() => setShowCatalog(v => !v)}
            className={`${panel} px-3 py-2 flex items-center gap-2 text-xs text-slate-200 hover:text-white`}
          >
            {showCatalog ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            <span className="font-mono uppercase tracking-[0.2em]">Star map</span>
          </button>
          {showCatalog && index && (
            <div className={`${panel} w-80 max-w-full flex-1 min-h-0 flex flex-col overflow-hidden`}>
              <div className="p-3 border-b border-white/10">
                <p className={eyebrow}>{index.categories.length} category systems</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 focus-within:border-sky-400/60">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    value={catalogQuery}
                    onChange={e => setCatalogQuery(e.target.value)}
                    placeholder="Find a category…"
                    className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 outline-none flex-1"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.3)_transparent]">
                <button
                  onClick={() => openCategory(null)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors ${!categorySlug ? 'bg-sky-400/15 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <Telescope className="h-4 w-4 text-amber-300" />
                  <span className="text-xs font-medium flex-1">Whole universe</span>
                  <span className="text-[10px] font-mono text-slate-500">{formatPeso(index.totals.value)}</span>
                </button>
                {catalog.map(c => (
                  <button
                    key={c.slug}
                    onClick={() => openCategory(c.slug)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors group ${c.slug === categorySlug ? 'bg-sky-400/15' : 'hover:bg-white/5'}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xs flex-1 truncate ${c.slug === categorySlug ? 'text-white font-medium' : 'text-slate-300 group-hover:text-white'}`}>{c.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{formatPeso(c.total)}</span>
                    </div>
                    <div className="mt-1 h-0.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-300"
                        style={{ width: `${Math.max(2, Math.sqrt(c.total / maxCategoryTotal) * 100)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Find a body in the current system */}
        <div className="absolute top-4 right-4 z-10 flex items-start gap-2">
        <button
          onClick={toggleFullView}
          className={`${panel} order-last flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:border-sky-400/50`}
          title={fullView ? 'Exit full view (Esc)' : 'Full view'}
        >
          {fullView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="font-mono uppercase tracking-[0.2em] hidden sm:inline">{fullView ? 'Exit' : 'Full view'}</span>
        </button>
        <div className="w-72 hidden sm:block">
          <div className={`${panel} px-3 py-2 flex items-center gap-2 focus-within:border-sky-400/60`}>
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={nodeQuery}
              onChange={e => setNodeQuery(e.target.value)}
              placeholder="Locate contractor, department…"
              className="bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none flex-1 min-w-0"
            />
            {nodeQuery && (
              <button onClick={() => setNodeQuery('')} className="text-slate-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          {nodeMatches.length > 0 && (
            <div className={`${panel} mt-2 p-1.5`}>
              {nodeMatches.map(n => (
                <button
                  key={n.id}
                  onClick={() => { selectNode(n); setNodeQuery('') }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[n.type], boxShadow: `0 0 8px ${NODE_COLORS[n.type]}` }} />
                  <span className="text-xs text-slate-200 truncate flex-1">{n.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{formatPeso(n.val)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Selected body */}
        {selected && (
          <aside className={`${panel} absolute z-20 right-4 top-28 sm:top-20 bottom-36 w-[22rem] max-w-[calc(100%-2rem)] flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-white/10">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: NODE_COLORS[selected.type], boxShadow: `0 0 14px ${NODE_COLORS[selected.type]}` }}
                />
                <div className="flex-1 min-w-0">
                  <p className={eyebrow}>{NODE_SINGULAR[selected.type]}</p>
                  <h2 className="mt-1 text-sm font-semibold text-white leading-snug">{selected.name}</h2>
                </div>
                <button onClick={clearSelection} className="text-slate-500 hover:text-white" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ['Value', formatPeso(selected.val)],
                  ['Contracts', selected.count.toLocaleString()],
                  ['Rank', `#${selected.rank + 1}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-slate-500">{k}</dt>
                    <dd className="text-sm font-semibold text-white font-mono">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex gap-2">
                {selected.type === 'category' && slugByName.has(selected.name) && selected.name !== currentCategory?.name && (
                  <button
                    onClick={() => openCategory(slugByName.get(selected.name)!)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-400 hover:to-sky-400 px-3 py-2 text-xs font-semibold text-white shadow-[0_0_20px_-4px_rgba(56,189,248,0.8)]"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Warp into this system
                  </button>
                )}
                {detailPath(selected) && (
                  <button
                    onClick={() => navigate(detailPath(selected)!)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-medium text-slate-100"
                  >
                    Open profile <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.3)_transparent]">
              {connections.length === 0 && <p className="text-xs text-slate-500 px-1">No connections in this view.</p>}
              {connections.map(group => (
                <section key={group.type}>
                  <p className={`${eyebrow} px-1 mb-1.5`} style={{ color: NODE_COLORS[group.type] }}>
                    {NODE_LABELS[group.type]} · {group.items.length}
                  </p>
                  {group.items.slice(0, 12).map(({ node, value, count }) => (
                    <button
                      key={node.id}
                      onClick={() => selectNode(node)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/5 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-200 group-hover:text-white truncate flex-1">{node.name}</span>
                        <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-slate-300" />
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">{formatPeso(value)} · {count.toLocaleString()} contracts</p>
                    </button>
                  ))}
                  {group.items.length > 12 && (
                    <p className="text-[10px] text-slate-500 px-2">+ {group.items.length - 12} more</p>
                  )}
                </section>
              ))}
            </div>
          </aside>
        )}

        {/* Legend doubles as layer toggles */}
        <div className={`${panel} absolute z-10 bottom-4 left-4 right-4 sm:right-auto p-2 flex flex-wrap gap-1 sm:max-w-[calc(100%-30rem)]`}>
          {presentTypes.map(type => (
            <button
              key={type}
              onClick={() => setVisibleTypes(v => ({ ...v, [type]: !v[type] }))}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors ${visibleTypes[type] ? 'text-slate-200 hover:bg-white/5' : 'text-slate-600 hover:bg-white/5'}`}
              title={`${visibleTypes[type] ? 'Hide' : 'Show'} ${NODE_LABELS[type].toLowerCase()}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={visibleTypes[type]
                  ? { backgroundColor: NODE_COLORS[type], boxShadow: `0 0 10px ${NODE_COLORS[type]}` }
                  : { backgroundColor: '#334155' }}
              />
              {NODE_LABELS[type]}
              <span className="font-mono text-[10px] text-slate-500">{counts[type] ?? 0}</span>
              {visibleTypes[type] ? <Eye className="h-3 w-3 text-slate-500" /> : <EyeOff className="h-3 w-3" />}
            </button>
          ))}
        </div>

        {/* Density, layout and camera */}
        <div className="absolute z-10 bottom-36 sm:bottom-4 right-4 flex flex-col items-end gap-2">
        <div className={`${panel} p-2 flex items-center gap-2`}>
          <span className={`${eyebrow} pl-1 hidden md:inline`}>Contractors</span>
          <div className="flex rounded-lg bg-white/5 p-0.5">
            {DENSITY_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${density === d ? 'bg-sky-400/25 text-white shadow-[0_0_12px_-2px_rgba(56,189,248,0.7)]' : 'text-slate-400 hover:text-white'}`}
              >
                {d}
              </button>
            ))}
          </div>
          {categorySlug && (
            <button
              onClick={() => setOrbits(o => !o)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${orbits ? 'bg-violet-400/20 text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
              title="Arrange bodies in orbital shells around the category"
            >
              <Orbit className="h-3.5 w-3.5" /> Orbits
            </button>
          )}
        </div>

        <div className={`${panel} p-1.5 flex gap-1`}>
          <HudButton label={autoRotate ? 'Pause drift' : 'Resume drift'} onClick={() => setAutoRotate(r => !r)}>
            {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </HudButton>
          <HudButton label="Zoom in" onClick={() => zoom(0.7)}><ZoomIn className="h-4 w-4" /></HudButton>
          <HudButton label="Zoom out" onClick={() => zoom(1.4)}><ZoomOut className="h-4 w-4" /></HudButton>
          <HudButton label="Reset view" onClick={clearSelection}><RotateCcw className="h-4 w-4" /></HudButton>
          <HudButton label={fullView ? 'Exit full view' : 'Full view'} onClick={toggleFullView}>
            {fullView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </HudButton>
        </div>
        </div>

        {/* Hover readout */}
        {hovered && hovered.id !== selected?.id && (
          <div
            className={`${panel} pointer-events-none absolute z-30 px-3 py-2 max-w-xs`}
            style={{ left: Math.min(pointer.x + 16, size.width - 260), top: pointer.y + 16 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: NODE_COLORS[hovered.type] }}>
              {NODE_SINGULAR[hovered.type]}
            </p>
            <p className="text-xs font-medium text-white leading-snug">{hovered.name}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              {formatPeso(hovered.val)} · {hovered.count.toLocaleString()} contracts
            </p>
          </div>
        )}

        {(loading || error) && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#02030a]/60 backdrop-blur-[2px]">
            <div className="text-center">
              {error ? (
                <>
                  <p className="text-sm text-rose-300">Lost signal: {error}</p>
                  {unknownCategory ? (
                    <button onClick={() => openCategory(null)} className="mt-3 text-xs text-sky-300 hover:text-sky-200 underline underline-offset-4">
                      Return to the whole universe
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Generate the data with data/philgeps/generate_network_graph.py</p>
                  )}
                </>
              ) : (
                <>
                  <div className="relative mx-auto h-16 w-16">
                    <div className="absolute inset-0 rounded-full border border-sky-400/30 animate-ping" />
                    <div className="absolute inset-3 rounded-full bg-amber-300 shadow-[0_0_40px_10px_rgba(252,211,77,0.5)]" />
                  </div>
                  <p className={`${eyebrow} mt-6`}>Charting {currentCategory?.name ?? 'the universe'}…</p>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
