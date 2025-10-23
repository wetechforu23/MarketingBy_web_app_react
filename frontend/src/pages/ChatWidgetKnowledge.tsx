import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/http'

interface KnowledgeEntry {
  id: number
  question: string
  answer: string
  category: string
  is_active: boolean
  created_at: string
}

export default function ChatWidgetKnowledge() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General'
  })

  useEffect(() => {
    fetchKnowledge()
  }, [id])

  const fetchKnowledge = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/chat-widget/widgets/${id}/knowledge`)
      setKnowledge(response.data)
    } catch (err: any) {
      console.error('Error fetching knowledge:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/chat-widget/widgets/${id}/knowledge/${editingId}`, formData)
      } else {
        await api.post(`/chat-widget/widgets/${id}/knowledge`, formData)
      }
      setFormData({ question: '', answer: '', category: 'General' })
      setShowForm(false)
      setEditingId(null)
      fetchKnowledge()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save knowledge entry')
    }
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setFormData({
      question: entry.question,
      answer: entry.answer,
      category: entry.category
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleDelete = async (entryId: number) => {
    if (!confirm('Delete this knowledge entry?')) return
    try {
      await api.delete(`/chat-widget/widgets/${id}/knowledge/${entryId}`)
      fetchKnowledge()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete knowledge entry')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            <i className="fas fa-brain" style={{ marginRight: '1rem', color: '#4682B4' }}></i>
            Knowledge Base
          </h1>
          <p style={{ color: '#6c757d', fontSize: '1rem' }}>
            Teach your chatbot what to say to customers
          </p>
        </div>
        <button
          onClick={() => navigate('/app/chat-widgets')}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
          Back to Widgets
        </button>
      </div>

      {/* Add New Knowledge Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({ question: '', answer: '', category: 'General' })
          }}
          style={{
            padding: '12px 24px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
          Add Knowledge Entry
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '600' }}>
            {editingId ? 'Edit Knowledge Entry' : 'Add New Knowledge Entry'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Question / Topic
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g., What are your business hours?"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Answer / Response
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="e.g., We are open Monday-Friday, 9 AM - 6 PM"
                required
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option>General</option>
                <option>Hours</option>
                <option>Pricing</option>
                <option>Services</option>
                <option>Appointments</option>
                <option>Location</option>
                <option>Contact</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData({ question: '', answer: '', category: 'General' })
                }}
                style={{
                  padding: '10px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Knowledge Entries List */}
      {knowledge.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          textAlign: 'center',
          border: '2px dashed #e0e0e0'
        }}>
          <i className="fas fa-brain" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem' }}></i>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No Knowledge Entries Yet
          </h3>
          <p style={{ color: '#6c757d' }}>
            Add your first knowledge entry to teach your chatbot how to respond to customers
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
          {knowledge.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e0e0e0'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <span style={{
                  padding: '4px 12px',
                  background: '#e3f2fd',
                  color: '#1976d2',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {entry.category}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(entry)}
                    style={{
                      padding: '6px 10px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    style={{
                      padding: '6px 10px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
                  {entry.question}
                </h4>
                <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
                  {entry.answer}
                </p>
              </div>

              <div style={{ fontSize: '12px', color: '#999' }}>
                Added: {new Date(entry.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

