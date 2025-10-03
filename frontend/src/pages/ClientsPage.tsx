import { useEffect, useState } from 'react'
import { api } from '../api/http'

type Client = { id: number; name: string }

export default function ClientsPage() {
  const [data, setData] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/clients').then(r => setData(r.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  return (
    <div>
      <h2>Clients</h2>
      <ul>
        {data.map(c => <li key={c.id}>{c.name}</li>)}
      </ul>
    </div>
  )
}


