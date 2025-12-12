import { useParams } from 'react-router-dom'
import EnhancedSearchInterface from './EnhancedSearchInterface'

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // Decode URL-encoded name (no slug conversion - preserve special characters)
  const categoryName = slug ? decodeURIComponent(slug) : ''

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
