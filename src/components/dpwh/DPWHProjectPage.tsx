import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { 
  HardHat, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Video,
  Image as ImageIcon,
  Download
} from 'lucide-react'
import Navigation from '../Navigation'
import Footer from '../Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Define the full project detail interface based on the actual API response
interface ProjectComponent {
  componentId: string
  description: string
  infraType: string
  typeOfWork: string
  region: string
  province: string
  coordinates?: {
    latitude: number
    longitude: number
    source?: string
    locationVerified?: boolean
  }
}

interface ProjectBidder {
  name: string
  pcabId?: string
  participation: number
  isWinner: boolean
}

interface DPWHProjectDetail {
  contractId: string
  description: string
  category: string
  status: string
  budget: number
  amountPaid: number
  progress: number
  location: {
    region: string
    province: string
    infraType: string
    coordinates: {
      latitude: number
      longitude: number
      verified: boolean
    }
  }
  infraType: string
  contractor: string
  startDate: string
  completionDate?: string | null
  infraYear: string
  contractEffectivityDate?: string
  expiryDate?: string
  nysReason?: string | null
  programName: string
  sourceOfFunds: string
  isVerifiedByDpwh: boolean
  isVerifiedByPublic: boolean
  isLive: boolean
  livestreamUrl?: string | null
  livestreamVideoId?: string | null
  livestreamDetectedAt?: string | null
  latitude: number
  longitude: number
  components?: ProjectComponent[]
  winnerNames?: string
  bidders?: ProjectBidder[]
  procurement?: {
    contractName: string
    abc: string
    status: string
    fundingInstrument: string
    advertisementDate: string
    bidSubmissionDeadline: string
    dateOfAward: string
    awardAmount: string
  }
  links?: {
    advertisement?: string
    contractAgreement?: string
    noticeOfAward?: string
    noticeToProceed?: string
    programOfWork?: string
    engineeringDesign?: string
  }
  imageSummary?: {
    totalImages: number
    latestImageDate: string
    hasImages: boolean
  }
}

interface ProjectDetailResponse {
  data: DPWHProjectDetail
}

const DPWHProjectPage = () => {
  const { contractId } = useParams<{ contractId: string }>()
  const [project, setProject] = useState<DPWHProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (contractId) {
      loadProjectDetail()
    }
  }, [contractId])

  const loadProjectDetail = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`https://api.dpwh.bettergov.ph/projects/${contractId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load project: ${response.status}`)
      }
      
      const result: ProjectDetailResponse = await response.json()
      setProject(result.data)
    } catch (err) {
      console.error('Error loading project detail:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'N/A'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'On-Going':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'Not Started':
      case 'For Procurement':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'Terminated':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'On-Going':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'For Procurement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Not Started':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'Terminated':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !project) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Project</h2>
            <p className="text-gray-600 mb-4">{error || 'Project not found'}</p>
            <Link to="/dpwh" className="text-blue-600 hover:underline">
              Return to DPWH Projects
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>{project.contractId} - {project.description.substring(0, 60)} - DPWH Project</title>
        <meta name="description" content={`DPWH ${project.category} project in ${project.location.province}. Contract ID: ${project.contractId}. ${project.description.substring(0, 150)}`} />
        <meta name="keywords" content={`DPWH, ${project.category}, ${project.location.province}, ${project.location.region}, infrastructure, ${project.contractor}`} />
      </Helmet>
      <Navigation />

      <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <HardHat className="h-8 w-8 text-blue-600 flex-shrink-0" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {project.contractId}
                </h1>
              </div>
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                {project.description}
              </p>
            </div>
          </div>

          {/* Status Badge and Live Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getStatusColor(project.status)}`}>
              {getStatusIcon(project.status)}
              <span className="font-semibold">{project.status}</span>
            </div>
            {project.isLive && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 bg-red-100 text-red-800 border-red-300">
                <Video className="h-5 w-5" />
                <span className="font-semibold">Live Stream Available</span>
              </div>
            )}
            {project.isVerifiedByDpwh && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">DPWH Verified</span>
              </div>
            )}
            {project.isVerifiedByPublic && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Public Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Budget
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-green-600">
                {formatCurrency(project.budget)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Allocated for this project</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount Paid
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-purple-600">
                {formatCurrency(project.amountPaid)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">
                {((project.amountPaid / project.budget) * 100).toFixed(1)}% of budget
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-blue-600">
                {project.progress.toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.min(project.progress, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-600">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Infrastructure Year
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-orange-600">
                {project.infraYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">{project.programName}</p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contract ID</label>
                    <p className="text-gray-900 font-mono">{project.contractId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-gray-900">
                      <Link 
                        to={`/dpwh/categories/${encodeURIComponent(project.category)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {project.category}
                      </Link>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Infrastructure Type</label>
                    <p className="text-gray-900">{project.location.infraType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Program</label>
                    <p className="text-gray-900">{project.programName}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Source of Funds</label>
                    <p className="text-gray-900">{project.sourceOfFunds}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-gray-900">{formatDate(project.startDate)}</p>
                  </div>
                  {project.completionDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Completion Date</label>
                      <p className="text-gray-900">{formatDate(project.completionDate)}</p>
                    </div>
                  )}
                  {project.contractEffectivityDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contract Effectivity</label>
                      <p className="text-gray-900">{formatDate(project.contractEffectivityDate)}</p>
                    </div>
                  )}
                  {project.expiryDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expiry Date</label>
                      <p className="text-gray-900">{formatDate(project.expiryDate)}</p>
                    </div>
                  )}
                </div>
                {project.nysReason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Reason for Not Yet Started</label>
                    <p className="text-gray-900">{project.nysReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contractor & Bidders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Contractor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Primary Contractor</label>
                  <p className="text-gray-900 text-lg">
                    <Link 
                      to={`/dpwh/contractors/${encodeURIComponent(project.contractor)}`}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {project.contractor}
                    </Link>
                  </p>
                </div>
                
                {project.winnerNames && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Winner Names</label>
                    <p className="text-gray-900">{project.winnerNames}</p>
                  </div>
                )}

                {project.bidders && project.bidders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Bidders</label>
                    <div className="space-y-2">
                      {project.bidders.map((bidder, index) => (
                        <div 
                          key={index}
                          className={`p-3 rounded-lg border ${
                            bidder.isWinner 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{bidder.name}</p>
                              {bidder.pcabId && (
                                <p className="text-xs text-gray-500">PCAB ID: {bidder.pcabId}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {bidder.participation}%
                              </p>
                              {bidder.isWinner && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                  <CheckCircle className="h-3 w-3" />
                                  Winner
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Procurement Information */}
            {project.procurement && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Procurement Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.procurement.contractName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contract Name</label>
                      <p className="text-gray-900">{project.procurement.contractName}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {project.procurement.abc && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">ABC</label>
                        <p className="text-gray-900">₱{parseFloat(project.procurement.abc).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {project.procurement.status && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status Code</label>
                        <p className="text-gray-900">{project.procurement.status}</p>
                      </div>
                    )}
                    {project.procurement.advertisementDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Advertisement Date</label>
                        <p className="text-gray-900">{formatDateTime(project.procurement.advertisementDate)}</p>
                      </div>
                    )}
                    {project.procurement.bidSubmissionDeadline && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bid Submission Deadline</label>
                        <p className="text-gray-900">{formatDateTime(project.procurement.bidSubmissionDeadline)}</p>
                      </div>
                    )}
                    {project.procurement.dateOfAward && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date of Award</label>
                        <p className="text-gray-900">{formatDateTime(project.procurement.dateOfAward)}</p>
                      </div>
                    )}
                    {project.procurement.awardAmount && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Award Amount</label>
                        <p className="text-gray-900">₱{parseFloat(project.procurement.awardAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                  </div>
                  {project.procurement.fundingInstrument && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Funding Instrument</label>
                      <p className="text-gray-900">{project.procurement.fundingInstrument}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Project Components */}
            {project.components && project.components.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardHat className="h-5 w-5 text-blue-600" />
                    Project Components ({project.components.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.components.map((component, index) => (
                      <div key={component.componentId} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">Component {index + 1}</h4>
                          <span className="text-xs font-mono text-gray-500">{component.componentId}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{component.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-1 text-gray-900">{component.infraType}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Work:</span>
                            <span className="ml-1 text-gray-900">{component.typeOfWork}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Region:</span>
                            <span className="ml-1 text-gray-900">{component.region}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Province:</span>
                            <span className="ml-1 text-gray-900">{component.province}</span>
                          </div>
                          {component.coordinates && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Coordinates:</span>
                              <span className="ml-1 text-gray-900">
                                {component.coordinates.latitude.toFixed(6)}, {component.coordinates.longitude.toFixed(6)}
                              </span>
                              {component.coordinates.locationVerified && (
                                <CheckCircle className="inline h-3 w-3 ml-1 text-green-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Location & Documents */}
          <div className="space-y-6">
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Region</label>
                  <p className="text-gray-900">
                    <Link 
                      to={`/dpwh/regions/${encodeURIComponent(project.location.region)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {project.location.region}
                    </Link>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Province</label>
                  <p className="text-gray-900">
                    <Link 
                      to={`/dpwh/provinces/${encodeURIComponent(project.location.province)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {project.location.province}
                    </Link>
                  </p>
                </div>
                {project.location.coordinates && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Coordinates</label>
                    <p className="text-gray-900 font-mono text-sm">
                      {project.location.coordinates.latitude.toFixed(6)}, {project.location.coordinates.longitude.toFixed(6)}
                    </p>
                    {project.location.coordinates.verified && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </p>
                    )}
                    <a
                      href={`https://www.google.com/maps?q=${project.location.coordinates.latitude},${project.location.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                    >
                      View on Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Stream */}
            {project.isLive && project.livestreamUrl && (
              <Card className="border-2 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <Video className="h-5 w-5" />
                    Live Stream
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <a
                    href={project.livestreamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors w-full justify-center"
                  >
                    <Video className="h-4 w-4" />
                    Watch Live Stream
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {project.livestreamDetectedAt && (
                    <p className="text-xs text-gray-600 text-center">
                      Detected: {formatDateTime(project.livestreamDetectedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Images */}
            {project.imageSummary?.hasImages && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Project Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Images</span>
                    <span className="font-semibold text-gray-900">{project.imageSummary.totalImages}</span>
                  </div>
                  {project.imageSummary.latestImageDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Latest Image</span>
                      <span className="text-sm text-gray-900">{formatDate(project.imageSummary.latestImageDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {project.links && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.links.advertisement && (
                      <a
                        href={project.links.advertisement}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-blue-50 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Advertisement
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {project.links.contractAgreement && (
                      <a
                        href={project.links.contractAgreement}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-blue-50 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Contract Agreement
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {project.links.noticeOfAward && (
                      <a
                        href={project.links.noticeOfAward}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-blue-50 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Notice of Award
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {project.links.noticeToProceed && (
                      <a
                        href={project.links.noticeToProceed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-blue-50 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Notice to Proceed
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {project.links.programOfWork && (
                      <a
                        href={project.links.programOfWork}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-blue-50 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Program of Work
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {project.links.engineeringDesign && (
                      <a
                        href={project.links.engineeringDesign}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 hover:bg-blue-50 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Engineering Design
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    )}
                    {!project.links.advertisement && 
                     !project.links.contractAgreement && 
                     !project.links.noticeOfAward && 
                     !project.links.noticeToProceed &&
                     !project.links.programOfWork &&
                     !project.links.engineeringDesign && (
                      <p className="text-sm text-gray-500 text-center py-2">No documents available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default DPWHProjectPage
