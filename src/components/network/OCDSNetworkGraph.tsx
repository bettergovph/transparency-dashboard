import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ForceGraph3D from 'react-force-graph-3d'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { toSlug } from '@/lib/utils'
import {
  Network, Users, Building2, MapPin, Grid3x3,
  ZoomIn, ZoomOut, Maximize2, Info, X, Filter,
  RotateCcw, Eye, EyeOff
} from 'lucide-react'
import * as THREE from 'three'

interface NetworkNode {
  id: string
  name: string
  type: 'contractor' | 'organization' | 'region' | 'category'
  val: number
  count: number
  x?: number
  y?: number
  z?: number
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  value: number
  count: number
}

interface NetworkData {
  nodes: NetworkNode[]
  links: NetworkLink[]
  metadata: {
    totalRecords: number
    filteredRecords: number
    nodeCount: number
    linkCount: number
    description?: string
  }
}

const NODE_COLORS: Record<string, string> = {
  contractor: '#3b82f6',    // blue
  organization: '#ef4444',  // red
  region: '#22c55e',        // green
  category: '#f59e0b',      // amber
}

const NODE_LABELS: Record<string, string> = {
  contractor: 'Contractors',
  organization: 'Departments',
  region: 'Regions',
  category: 'Categories',
}

const NODE_ICONS: Record<string, React.ElementType> = {
  contractor: Users,
  organization: Building2,
  region: MapPin,
  category: Grid3x3,
}

function formatAmount(val: number): string {
  if (val >= 1e12) return `₱${(val / 1e12).toFixed(1)}T`
  if (val >= 1e9) return `₱${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `₱${(val / 1e6).toFixed(1)}M`
  if (val >= 1e3) return `₱${(val / 1e3).toFixed(0)}K`
  return `₱${val.toFixed(0)}`
}

export default function OCDSNetworkGraph() {
  const navigate = useNavigate()
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null)
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    contractor: true,
    organization: true,
    region: true,
    category: true,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Load network data
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/network/ocds_network.json')
        if (!response.ok) throw new Error('Failed to load network data')
        const data: NetworkData = await response.json()
        setGraphData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Responsive sizing
  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Filter graph data based on visible types
  const filteredData = useMemo(() => {
    if (!graphData) return null

    const visibleNodeIds = new Set(
      graphData.nodes
        .filter(n => visibleTypes[n.type])
        .map(n => n.id)
    )

    return {
      nodes: graphData.nodes.filter(n => visibleTypes[n.type]),
      links: graphData.links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id
        const targetId = typeof l.target === 'string' ? l.target : l.target.id
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)
      }),
    }
  }, [graphData, visibleTypes])

  // Get connected nodes for a selected node
  const connectedNodes = useMemo(() => {
    if (!selectedNode || !graphData) return []

    const connected: { node: NetworkNode; value: number; count: number }[] = []
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]))

    for (const link of graphData.links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id

      if (sourceId === selectedNode.id) {
        const node = nodeMap.get(targetId)
        if (node) connected.push({ node, value: link.value, count: link.count })
      } else if (targetId === selectedNode.id) {
        const node = nodeMap.get(sourceId)
        if (node) connected.push({ node, value: link.value, count: link.count })
      }
    }

    return connected.sort((a, b) => b.value - a.value)
  }, [selectedNode, graphData])

  const handleNodeClick = useCallback((node: NetworkNode) => {
    setSelectedNode(node)
    // Focus camera on clicked node
    if (graphRef.current) {
      const distance = 200
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0)
      graphRef.current.cameraPosition(
        {
          x: (node.x || 0) * distRatio,
          y: (node.y || 0) * distRatio,
          z: (node.z || 0) * distRatio,
        },
        { x: node.x, y: node.y, z: node.z },
        1500
      )
    }
  }, [])

  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    setHoveredNode(node)
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'default'
    }
  }, [])

  const navigateToNode = useCallback((node: NetworkNode) => {
    const slug = toSlug(node.name)
    switch (node.type) {
      case 'contractor':
        navigate(`/awardees/${slug}`)
        break
      case 'organization':
        navigate(`/organizations/${slug}`)
        break
      case 'region':
        navigate(`/locations/${slug}`)
        break
      case 'category':
        navigate(`/categories/${slug}`)
        break
    }
  }, [navigate])

  const resetCamera = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.cameraPosition({ x: 0, y: 0, z: 600 }, { x: 0, y: 0, z: 0 }, 1500)
    }
  }, [])

  const zoomIn = useCallback(() => {
    if (graphRef.current) {
      const cam = graphRef.current.camera()
      graphRef.current.cameraPosition(
        { x: cam.position.x * 0.7, y: cam.position.y * 0.7, z: cam.position.z * 0.7 },
        undefined,
        500
      )
    }
  }, [])

  const zoomOut = useCallback(() => {
    if (graphRef.current) {
      const cam = graphRef.current.camera()
      graphRef.current.cameraPosition(
        { x: cam.position.x * 1.4, y: cam.position.y * 1.4, z: cam.position.z * 1.4 },
        undefined,
        500
      )
    }
  }, [])

  const toggleType = useCallback((type: string) => {
    setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }, [])

  // Compute node sizes based on val (logarithmic scale)
  const nodeRelSize = 4
  const getNodeVal = useCallback((node: NetworkNode) => {
    return Math.max(1, Math.log10(node.val / 1e6))
  }, [])

  // Custom 3D node objects
  const nodeThreeObject = useCallback((node: NetworkNode) => {
    const color = NODE_COLORS[node.type] || '#888'
    const size = Math.max(3, Math.log10(node.val / 1e6) * 2.5)

    const group = new THREE.Group()

    // Sphere
    const geometry = new THREE.SphereGeometry(size, 16, 16)
    const material = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: selectedNode
        ? (selectedNode.id === node.id || connectedNodes.some(c => c.node.id === node.id))
          ? 1.0
          : 0.15
        : 0.85,
    })
    const sphere = new THREE.Mesh(geometry, material)
    group.add(sphere)

    // Glow ring for highlighted nodes
    if (selectedNode?.id === node.id) {
      const ringGeo = new THREE.RingGeometry(size + 1, size + 2.5, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      group.add(ring)
    }

    // Label sprite
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 512
    canvas.height = 64
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const label = node.name.length > 30 ? node.name.slice(0, 28) + '...' : node.name
    ctx.fillText(label, 256, 32)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: selectedNode
        ? (selectedNode.id === node.id || connectedNodes.some(c => c.node.id === node.id))
          ? 1.0
          : 0.1
        : 0.8,
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(40, 5, 1)
    sprite.position.set(0, size + 5, 0)
    group.add(sprite)

    return group
  }, [selectedNode, connectedNodes])

  // Link styling
  const getLinkColor = useCallback((link: NetworkLink) => {
    if (!selectedNode) return 'rgba(255,255,255,0.12)'

    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id

    if (sourceId === selectedNode.id || targetId === selectedNode.id) {
      return 'rgba(255,255,255,0.6)'
    }
    return 'rgba(255,255,255,0.03)'
  }, [selectedNode])

  const getLinkWidth = useCallback((link: NetworkLink) => {
    if (!selectedNode) return 0.5

    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id

    if (sourceId === selectedNode.id || targetId === selectedNode.id) {
      return Math.max(1, Math.log10(link.value / 1e8) * 2)
    }
    return 0.2
  }, [selectedNode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading network graph data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !filteredData) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Network className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Failed to load network data</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-white font-bold text-lg">OCDS Procurement Network</h1>
              <p className="text-gray-400 text-xs">
                3D visualization of procurement relationships between contractors, departments, regions, and categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Node type counts */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              {Object.entries(NODE_LABELS).map(([type, label]) => {
                const count = graphData!.nodes.filter(n => n.type === type).length
                return (
                  <span key={type} className="flex items-center gap-1 text-xs text-gray-400">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[type] }}
                    />
                    {count} {label}
                  </span>
                )
              })}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Filter node types"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Graph information"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main graph area */}
      <div className="flex-1 relative" ref={containerRef}>
        {/* 3D Force Graph */}
        <ForceGraph3D
          ref={graphRef}
          graphData={filteredData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#030712"
          nodeRelSize={nodeRelSize}
          nodeVal={getNodeVal}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkOpacity={0.6}
          linkDirectionalParticles={selectedNode ? 2 : 0}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.005}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
          warmupTicks={100}
          cooldownTicks={200}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          onBackgroundClick={() => setSelectedNode(null)}
        />

        {/* Camera controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={resetCamera}
            className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
            title="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (graphRef.current) {
                const el = containerRef.current
                if (el && document.fullscreenElement) {
                  document.exitFullscreen()
                } else if (el) {
                  el.requestFullscreen()
                }
              }
            }}
            className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 w-64 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Filter Nodes</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {Object.entries(NODE_LABELS).map(([type, label]) => {
              const Icon = NODE_ICONS[type]
              const count = graphData!.nodes.filter(n => n.type === type).length
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${visibleTypes[type]
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-900 text-gray-500'
                    }`}
                >
                  {visibleTypes[type]
                    ? <Eye className="h-4 w-4" />
                    : <EyeOff className="h-4 w-4" />
                  }
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: visibleTypes[type] ? NODE_COLORS[type] : '#4b5563' }}
                  />
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left text-sm">{label}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Info panel */}
        {showInfo && (
          <div className="absolute top-4 left-4 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">About This Graph</h3>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-gray-300 text-xs space-y-2">
              <p>
                This 3D network graph visualizes procurement relationships from the
                Philippine Government Electronic Procurement System (PhilGEPS) using
                the Open Contracting Data Standard (OCDS).
              </p>
              <p className="font-semibold text-gray-200 mt-3">Node Types:</p>
              <div className="space-y-1">
                {Object.entries(NODE_LABELS).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
                    <span className="font-medium">{label}:</span>
                    <span className="text-gray-400">
                      {type === 'contractor' && 'Contract awardees'}
                      {type === 'organization' && 'Procuring entities'}
                      {type === 'region' && 'Areas of delivery'}
                      {type === 'category' && 'Business categories'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-semibold text-gray-200 mt-3">Interactions:</p>
              <ul className="list-disc list-inside text-gray-400 space-y-0.5">
                <li>Click a node to see its connections</li>
                <li>Click background to deselect</li>
                <li>Drag nodes to reposition them</li>
                <li>Scroll to zoom, drag to rotate</li>
                <li>Use the "View Details" button to navigate to the entity page</li>
              </ul>
              {graphData?.metadata && (
                <>
                  <p className="font-semibold text-gray-200 mt-3">Stats:</p>
                  <div className="text-gray-400">
                    <p>{graphData.metadata.nodeCount} nodes, {graphData.metadata.linkCount} links</p>
                    <p>{graphData.metadata.totalRecords.toLocaleString()} total procurement records</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 shadow-xl pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[hoveredNode.type] }} />
              <span className="text-white font-medium text-sm">{hoveredNode.name}</span>
            </div>
            <div className="text-gray-400 text-xs mt-1">
              {NODE_LABELS[hoveredNode.type]} &middot; {formatAmount(hoveredNode.val)} &middot; {hoveredNode.count.toLocaleString()} contracts
            </div>
          </div>
        )}

        {/* Selected node detail panel */}
        {selectedNode && (
          <div className="absolute top-4 left-4 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl w-80 max-h-[calc(100%-2rem)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[selectedNode.type] }} />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{NODE_LABELS[selectedNode.type]}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm leading-tight">{selectedNode.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-white ml-2 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-4 mt-3">
                <div>
                  <p className="text-gray-500 text-xs">Total Value</p>
                  <p className="text-white font-semibold text-sm">{formatAmount(selectedNode.val)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Contracts</p>
                  <p className="text-white font-semibold text-sm">{selectedNode.count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Connections</p>
                  <p className="text-white font-semibold text-sm">{connectedNodes.length}</p>
                </div>
              </div>

              <button
                onClick={() => navigateToNode(selectedNode)}
                className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                View Details Page
              </button>
            </div>

            {/* Connections list */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Connected Entities ({connectedNodes.length})
              </p>
              <div className="space-y-1">
                {connectedNodes.map(({ node, value, count }) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: NODE_COLORS[node.type] }}
                      />
                      <span className="text-white text-xs truncate flex-1 group-hover:text-blue-400">{node.name}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5 ml-4">
                      {formatAmount(value)} &middot; {count.toLocaleString()} contracts
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-lg px-3 py-2">
          <div className="flex items-center gap-4">
            {Object.entries(NODE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
                <span className="text-gray-400 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
