import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, AlertCircle, Maximize2, Minimize2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DPWHProject } from '@/types/dpwh'

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface MapViewProps {
  projects: DPWHProject[]
}

const MapView = ({ projects }: MapViewProps) => {
  const [selectedProject, setSelectedProject] = useState<DPWHProject | null>(null)
  const [displayLimit, setDisplayLimit] = useState(1000)
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.8797, 121.7740]) // Philippines center
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapKey, setMapKey] = useState(0) // Key to force map rerender

  // Filter projects with valid coordinates
  const projectsWithCoords = useMemo(() => {
    return projects.filter(p => 
      p.latitude && 
      p.longitude &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
    )
  }, [projects])

  // Limit displayed projects strategically
  const displayedProjects = useMemo(() => {
    if (projectsWithCoords.length <= displayLimit) {
      return projectsWithCoords
    }

    // Prioritize: 1) Higher budget projects, 2) Recent years, 3) On-going status
    return [...projectsWithCoords]
      .sort((a, b) => {
        // Priority 1: Status (On-Going > Others)
        if (a.status === 'On-Going' && b.status !== 'On-Going') return -1
        if (a.status !== 'On-Going' && b.status === 'On-Going') return 1
        
        // Priority 2: Budget (higher first)
        if (a.budget !== b.budget) return b.budget - a.budget
        
        // Priority 3: Year (more recent first)
        return b.infraYear - a.infraYear
      })
      .slice(0, displayLimit)
  }, [projectsWithCoords, displayLimit])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#10b981'
      case 'On-Going':
        return '#3b82f6'
      case 'For Procurement':
        return '#f59e0b'
      case 'Not Started':
      case 'Not Yet Started':
        return '#6b7280'
      case 'Terminated':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  // Create custom colored markers for different statuses
  const createCustomIcon = (status: string) => {
    const color = getStatusColor(status)
    const svgIcon = `
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" 
              fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
      </svg>
    `
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    })
  }

  const handleIncreaseLimit = () => {
    setDisplayLimit(prev => Math.min(prev + 1000, projectsWithCoords.length))
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    // Force map to rerender by changing key
    setTimeout(() => {
      setMapKey(prev => prev + 1)
    }, 100)
  }

  // Calculate bounds for displayed projects
  const bounds = useMemo(() => {
    if (displayedProjects.length === 0) return null
    
    const lats = displayedProjects.map(p => p.latitude!)
    const lngs = displayedProjects.map(p => p.longitude!)
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    }
  }, [displayedProjects])

  useEffect(() => {
    if (bounds && displayedProjects.length > 0) {
      // Center map on the bounds
      setMapCenter([
        (bounds.minLat + bounds.maxLat) / 2,
        (bounds.minLng + bounds.maxLng) / 2
      ])
    }
  }, [bounds, displayedProjects.length])

  // Component to fit bounds when they change
  const FitBounds = () => {
    const map = useMap()
    
    useEffect(() => {
      if (bounds && displayedProjects.length > 0) {
        map.fitBounds([
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng]
        ], { 
          padding: [50, 50],
          maxZoom: 12 // Limit max zoom to keep pins visible
        })
      }
    }, [map, bounds])
    
    return null
  }

  if (projectsWithCoords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <MapPin className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Location Data</h3>
        <p className="text-gray-600 text-center max-w-md">
          None of the filtered projects have valid coordinate information to display on the map.
        </p>
      </div>
    )
  }

  return (
    <>
      {isFullscreen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleFullscreen} />}
      <div className={`${isFullscreen ? 'fixed top-16 left-0 right-0 bottom-0 z-50 bg-white' : 'relative'}`}>
      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">
                Showing {displayedProjects.length.toLocaleString()} of {projectsWithCoords.length.toLocaleString()} projects with location data
              </p>
              <p className="text-blue-700 text-xs mt-1">
                {projectsWithCoords.length > displayLimit && (
                  <>Projects are prioritized by status, budget, and year. </>
                )}
                {projects.length - projectsWithCoords.length > 0 && (
                  <>{(projects.length - projectsWithCoords.length).toLocaleString()} projects without coordinates are hidden. </>
                )}
              </p>
            </div>
          </div>
          {displayedProjects.length < projectsWithCoords.length && (
            <button
              onClick={handleIncreaseLimit}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              Show {Math.min(1000, projectsWithCoords.length - displayedProjects.length)} More
            </button>
          )}
        </div>
        
        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="ml-4 p-2 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 text-blue-900 flex-shrink-0"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-5 w-5" />
              <span className="text-xs font-medium hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-5 w-5" />
              <span className="text-xs font-medium hidden sm:inline">Fullscreen</span>
            </>
          )}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative bg-gray-100" style={{ height: isFullscreen ? 'calc(100vh - 128px)' : '600px' }}>
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={7}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds />
          
          {/* Render markers with clustering */}
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
          >
            {displayedProjects.map((project) => (
              <Marker
                key={project.contractId}
                position={[project.latitude!, project.longitude!]}
                icon={createCustomIcon(project.status)}
              >
                <Popup maxWidth={300}>
                  <div className="p-2">
                    <Link
                      to={`/dpwh/projects/${project.contractId}`}
                      className="font-semibold text-blue-600 hover:underline block mb-2"
                    >
                      {project.contractId}
                    </Link>
                    <p className="text-xs text-gray-900 mb-2 line-clamp-3">
                      {project.description}
                    </p>
                    <div className="space-y-1 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget:</span>
                        <span className="font-semibold">{formatCurrency(project.budget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Progress:</span>
                        <span className="font-semibold">{project.progress.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'On-Going' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'For Procurement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="pt-1 border-t">
                        <span className="text-gray-600">Location:</span>
                        <p className="text-gray-900">{project.location.province}, {project.location.region}</p>
                      </div>
                    </div>
                    <Link
                      to={`/dpwh/projects/${project.contractId}`}
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium py-2 px-4 rounded transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-[1000]">
          <h4 className="font-semibold text-sm text-gray-900 mb-3">Project Status</h4>
          <div className="space-y-2">
            {[
              { status: 'On-Going', color: '#3b82f6' },
              { status: 'Completed', color: '#10b981' },
              { status: 'For Procurement', color: '#f59e0b' },
              { status: 'Not Yet Started', color: '#6b7280' },
              { status: 'Terminated', color: '#ef4444' }
            ].map(({ status, color }) => {
              const count = displayedProjects.filter(p => p.status === status || (status === 'Not Yet Started' && p.status === 'Not Started')).length
              return (
                <div key={status} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-700">{status}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Project List - Scrollable sidebar - Only show when not in fullscreen */}
      {!isFullscreen && (
        <div className="border-t border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-900">Projects on Map</h3>
            <p className="text-xs text-gray-600 mt-0.5">Click on a project to highlight it on the map</p>
          </div>
          <div className="overflow-y-auto max-h-96">
            <div className="divide-y divide-gray-100">
            {displayedProjects.map((project) => (
              <div
                key={project.contractId}
                className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedProject?.contractId === project.contractId ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link
                        to={`/dpwh/projects/${project.contractId}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.contractId}
                      </Link>
                      <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(project.budget)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-900 line-clamp-2 mb-1">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.location.province}
                      </span>
                      <span>
                        {project.latitude!.toFixed(4)}, {project.longitude!.toFixed(4)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'On-Going' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'For Procurement' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}    
    </div>
    </>
  )
}

export default MapView
