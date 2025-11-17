import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'
import { fromSlug } from '@/lib/utils'

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Convert slug back to readable name
  const categoryName = slug ? fromSlug(slug) : ''

  return (
    <EnhancedSearchInterface  
      filterType="category" 
      filterValue={categoryName}
      enableDeduplication={false}
      limit={10000}
    />
  )
}

export default CategoryPage
