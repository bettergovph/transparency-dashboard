import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'

const OrganizationPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Decode URL-encoded name (no slug conversion - preserve special characters)
  const organizationName = slug ? decodeURIComponent(slug) : ''

  return (
    <EnhancedSearchInterface 
      filterType="organization" 
      filterValue={organizationName}
      enableDeduplication={false}
      limit={10000}
    />
  )
}

export default OrganizationPage
