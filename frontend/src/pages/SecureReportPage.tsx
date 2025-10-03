import { useParams } from 'react-router-dom'

export default function SecureReportPage(){
  const { token } = useParams()
  return <div>Secure Report for token: {token}</div>
}


