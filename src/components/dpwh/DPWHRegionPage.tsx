import { useParams } from 'react-router-dom'
import DPWHBrowser from './DPWHBrowser'

const DPWHRegionPage = () => {
  const { slug } = useParams<{ slug: string }>()

  return <DPWHBrowser filterType="region" filterValue={slug} />
}

export default DPWHRegionPage
