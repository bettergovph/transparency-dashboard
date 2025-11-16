import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'
import { fromSlug } from '@/lib/utils'

const OrganizationPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Convert slug back to readable name
  const organizationName = slug ? fromSlug(slug) : ''

  return <EnhancedSearchInterface filterType="organization" filterValue={organizationName} />
}

export default OrganizationPage
