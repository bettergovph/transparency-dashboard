import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'
import { fromSlug } from '@/lib/utils'

const AwardeePage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Convert slug back to readable name
  const awardeeName = slug ? fromSlug(slug) : ''

  return <EnhancedSearchInterface filterType="awardee" filterValue={awardeeName} />
}

export default AwardeePage
