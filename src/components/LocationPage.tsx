import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'
import { fromSlug } from '@/lib/utils'

const LocationPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Convert slug back to readable name
  const locationName = slug ? fromSlug(slug) : ''

  return <EnhancedSearchInterface filterType="location" filterValue={locationName} />
}

export default LocationPage
