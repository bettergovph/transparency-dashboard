import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'

const LocationPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Decode URL-encoded name (no slug conversion - preserve special characters)
  const locationName = slug ? decodeURIComponent(slug) : ''

  return (
    <EnhancedSearchInterface 
      filterType="location" 
      filterValue={locationName}
      enableDeduplication={false}
      limit={10000}
    />
  )
}

export default LocationPage
