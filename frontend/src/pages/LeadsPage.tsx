import { useEffect, useState } from 'react'
import { api } from '../api/http'

type Lead = { id: number; name: string }

export default function LeadsPage() {
  const [data, setData] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/leads').then(r => setData(r.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  return (
    <div>
      <h2>Leads</h2>
      <ul>
        {data.map(l => <li key={l.id}>{l.name}</li>)}
      </ul>
    </div>
  )
}


