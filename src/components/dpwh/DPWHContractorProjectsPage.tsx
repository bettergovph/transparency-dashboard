import { useParams } from 'react-router-dom'
import DPWHBrowser from './DPWHBrowser'

const DPWHContractorProjectsPage = () => {
  const { slug } = useParams<{ slug: string }>()

  return <DPWHBrowser filterType="contractor" filterValue={slug} />
}

export default DPWHContractorProjectsPage
