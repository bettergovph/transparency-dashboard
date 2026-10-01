export type NodeType = 'category' | 'region' | 'province' | 'organization' | 'contractor'

export interface GraphNode {
  id: string
  type: NodeType
  name: string
  val: number
  count: number
  /** Rank by value within its type (0 = largest) */
  rank: number
  /** Visual radius, scaled within its type */
  r: number
  x?: number
  y?: number
  z?: number
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  value: number
  count: number
}

export interface Graph {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface CategoryInfo {
  name: string
  slug: string
  total: number
  count: number
  contractors: number
  organizations: number
  nodes: number
  links: number
}

export interface NetworkIndex {
  generatedAt: string
  source: string
  totals: { value: number; contracts: number; contractors: number; organizations: number }
  categories: CategoryInfo[]
  overview: Graph
}

type CompactNode = [NodeType, string, number, number]
type CompactLink = [number, number, number, number]
interface CompactGraph {
  nodes: CompactNode[]
  links: CompactLink[]
}

export const NODE_TYPES: NodeType[] = ['category', 'region', 'province', 'organization', 'contractor']

export const NODE_COLORS: Record<NodeType, string> = {
  category: '#fcd34d',
  region: '#c084fc',
  province: '#6ee7b7',
  organization: '#fb7185',
  contractor: '#38bdf8',
}

export const NODE_LABELS: Record<NodeType, string> = {
  category: 'Categories',
  region: 'Regions',
  province: 'Provinces',
  organization: 'Departments',
  contractor: 'Contractors',
}

export const NODE_SINGULAR: Record<NodeType, string> = {
  category: 'Category',
  region: 'Region',
  province: 'Province',
  organization: 'Department / Agency',
  contractor: 'Contractor',
}

const RADIUS_RANGE: Record<NodeType, [number, number]> = {
  category: [7, 16],
  region: [4, 9],
  province: [1.6, 4.5],
  organization: [1.4, 6],
  contractor: [0.9, 4.5],
}

export const linkEndId = (end: string | GraphNode) => (typeof end === 'string' ? end : end.id)

function expand(compact: CompactGraph, overview = false): Graph {
  const maxByType: Partial<Record<NodeType, number>> = {}
  for (const [type, , val] of compact.nodes) {
    maxByType[type] = Math.max(maxByType[type] ?? 0, val)
  }

  const rankByType: Partial<Record<NodeType, number>> = {}
  const order = compact.nodes
    .map((n, i) => ({ i, type: n[0], val: n[2] }))
    .sort((a, b) => b.val - a.val)
  const ranks: number[] = []
  for (const { i, type } of order) {
    ranks[i] = rankByType[type] ?? 0
    rankByType[type] = ranks[i] + 1
  }

  const nodes: GraphNode[] = compact.nodes.map(([type, name, val, count], i) => {
    // Many category suns share the overview, so keep them smaller there
    const [min, max] = overview && type === 'category' ? [2.5, 10] : RADIUS_RANGE[type]
    const ratio = maxByType[type] ? Math.cbrt(val / maxByType[type]!) : 0
    return { id: `${type}:${name}`, type, name, val, count, rank: ranks[i], r: min + (max - min) * ratio }
  })

  const links: GraphLink[] = compact.links.map(([s, t, value, count]) => ({
    source: nodes[s].id,
    target: nodes[t].id,
    value,
    count,
  }))

  return { nodes, links }
}

const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    const request = fetch(url).then(res => {
      if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`)
      return res.json()
    })
    request.catch(() => cache.delete(url))
    cache.set(url, request)
  }
  return cache.get(url) as Promise<T>
}

export async function loadNetworkIndex(): Promise<NetworkIndex> {
  const raw = await fetchJson<Omit<NetworkIndex, 'overview'> & { overview: CompactGraph }>('/data/network/index.json')
  return { ...raw, overview: expand(raw.overview, true) }
}

export async function loadCategoryGraph(slug: string): Promise<Graph> {
  const raw = await fetchJson<CompactGraph>(`/data/network/categories/${slug}.json`)
  // Graphs are mutated by the force engine, so always hand out fresh objects
  return expand(raw)
}

export function formatPeso(val: number): string {
  if (val >= 1e12) return `₱${(val / 1e12).toFixed(2)}T`
  if (val >= 1e9) return `₱${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `₱${(val / 1e6).toFixed(1)}M`
  if (val >= 1e3) return `₱${(val / 1e3).toFixed(0)}K`
  return `₱${val.toFixed(0)}`
}

/** Route to the existing detail page for an entity, if one exists */
export function detailPath(node: GraphNode): string | null {
  const name = encodeURIComponent(node.name)
  switch (node.type) {
    case 'contractor': return `/awardees/${name}`
    case 'organization': return `/organizations/${name}`
    case 'province': return `/locations/${name}`
    case 'category': return `/categories/${name}`
    default: return null
  }
}
