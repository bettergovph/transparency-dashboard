import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'

const AwardeePage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Decode URL-encoded name (no slug conversion - preserve special characters)
  const awardeeName = slug ? decodeURIComponent(slug) : ''

  return <EnhancedSearchInterface filterType="awardee" filterValue={awardeeName} enableDeduplication={false} limit={5000} />
}

export default AwardeePage
