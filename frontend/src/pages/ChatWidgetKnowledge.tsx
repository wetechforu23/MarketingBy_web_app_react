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
  const [widget, setWidget] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General'
  })

  useEffect(() => {
    fetchWidget()
    fetchKnowledge()
  }, [id])

  const fetchWidget = async () => {
    try {
      const response = await api.get(`/chat-widget/widgets`)
      const widgetData = response.data.find((w: any) => w.id === parseInt(id!))
      setWidget(widgetData)
    } catch (err: any) {
      console.error('Error fetching widget:', err)
    }
  }

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

  // Bulk upload functionality
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    // Extract unique categories
    const uniqueCategories = ['All', ...new Set(knowledge.map(k => k.category))]
    setCategories(uniqueCategories)
  }, [knowledge])

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    
    return lines.slice(1).map(line => {
      // Handle CSV with quoted fields
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''))
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''))
      
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ''
      })
      return obj
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setUploadResult(null)

      const text = await file.text()
      let entries: any[] = []

      if (file.name.endsWith('.csv')) {
        entries = parseCSV(text)
      } else if (file.name.endsWith('.json')) {
        entries = JSON.parse(text)
      } else {
        throw new Error('Unsupported file type. Please upload CSV or JSON.')
      }

      // Send to backend
      const response = await api.post(`/chat-widget/widgets/${id}/knowledge/bulk`, {
        entries,
        skipDuplicates: true
      })

      setUploadResult(response.data)
      fetchKnowledge()
      
      // Clear file input
      event.target.value = ''
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = `category,question,answer
Appointments,How do I book an appointment?,"You can book by calling us or using our online form."
Services,What services do you offer?,"We offer comprehensive healthcare services."
Hours,What are your business hours?,"We're open Monday-Friday 9 AM - 6 PM."
Contact,What is your phone number?,"You can reach us at (555) 123-4567."`
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'knowledge-base-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Filter knowledge by category
  const filteredKnowledge = selectedCategory === 'All' 
    ? knowledge 
    : knowledge.filter(k => k.category === selectedCategory)

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

      {/* Client Assignment Banner - Shows this knowledge is client-specific */}
      {widget && widget.client_id && (
        <div style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderRadius: '12px',
          border: '3px solid #2196f3',
          marginBottom: '2rem',
          boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <i className="fas fa-building" style={{ fontSize: '1.5rem', color: '#1976d2', marginRight: '1rem' }}></i>
            <div>
              <div style={{ fontSize: '14px', color: '#1976d2', fontWeight: '600' }}>
                Widget: {widget.widget_name}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0d47a1' }}>
                Client ID: {widget.client_id}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#555', marginTop: '0.5rem', lineHeight: '1.6' }}>
            <i className="fas fa-lock" style={{ marginRight: '6px', color: '#1976d2' }}></i>
            <strong>Private Knowledge Base:</strong> This knowledge is ONLY for Client {widget.client_id}.
            <br/>
            <i className="fas fa-info-circle" style={{ marginRight: '6px', color: '#1976d2', marginTop: '4px' }}></i>
            When customers chat on this client's website, the bot will ONLY use knowledge from this list.
          </div>
        </div>
      )}

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

      {/* BULK UPLOAD SECTION */}
      <div style={{
        background: 'linear-gradient(135deg, #fff5e6 0%, #ffe0b2 100%)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '2px solid #ff9800',
        marginBottom: '2rem',
        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)'
      }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '700', color: '#e65100' }}>
          <i className="fas fa-upload" style={{ marginRight: '10px' }}></i>
          Bulk Upload Knowledge (CSV/JSON)
        </h3>
        <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '1rem', lineHeight: '1.6' }}>
          Upload a CSV or JSON file with <strong>category</strong>, <strong>question</strong>, and <strong>answer</strong> columns. Duplicates will be skipped automatically.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              border: '2px solid #ff9800',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer'
            }}
          />
          <button
            onClick={downloadTemplate}
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
            <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
            Download Template
          </button>
        </div>

        {uploading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginTop: '1rem',
            color: '#856404'
          }}>
            <div className="spinner-border spinner-border-sm" role="status"></div>
            <span style={{ fontWeight: '600' }}>Processing your file...</span>
          </div>
        )}

        {uploadResult && (
          <div style={{
            padding: '1rem',
            background: '#d4edda',
            border: '2px solid #28a745',
            borderRadius: '8px',
            marginTop: '1rem',
            color: '#155724'
          }}>
            <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: '700', fontSize: '16px' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
              Upload Complete!
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Total Entries:</strong> {uploadResult.summary.total}</li>
              <li style={{ color: '#28a745' }}><strong>✅ Inserted:</strong> {uploadResult.summary.inserted}</li>
              <li style={{ color: '#ffc107' }}><strong>⏭️  Skipped (Duplicates):</strong> {uploadResult.summary.skipped}</li>
              {uploadResult.summary.errors > 0 && (
                <li style={{ color: '#dc3545' }}><strong>❌ Errors:</strong> {uploadResult.summary.errors}</li>
              )}
            </ul>
            {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
              <details style={{ marginTop: '1rem', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#dc3545' }}>
                  View Error Details
                </summary>
                <ul style={{ marginTop: '10px', paddingLeft: '1.5rem', fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                  {uploadResult.errorDetails.map((err: any, index: number) => (
                    <li key={index} style={{ marginBottom: '5px' }}>
                      {JSON.stringify(err.entry)} - <strong>Reason:</strong> {err.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
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

