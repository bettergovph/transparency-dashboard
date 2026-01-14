import { useParams } from 'react-router-dom'
import DPWHBrowser from './DPWHBrowser'

const DPWHProvincePage = () => {
  const { slug } = useParams<{ slug: string }>()

  return <DPWHBrowser filterType="province" filterValue={slug} />
}

export default DPWHProvincePage
