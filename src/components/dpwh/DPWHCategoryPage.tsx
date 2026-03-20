import { useParams } from 'react-router-dom'
import DPWHBrowser from './DPWHBrowser'

const DPWHCategoryPage = () => {
  const { slug } = useParams<{ slug: string }>()

  return <DPWHBrowser filterType="category" filterValue={slug} />
}

export default DPWHCategoryPage
