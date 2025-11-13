import { useState, useEffect } from 'react';
import { api } from '../api/http';

export default function ClientContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contacts');
      setContacts(response.data.contacts || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Contacts Directory</h1>
        <p>Loading contacts...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Contacts Directory</h1>
      {contacts.length === 0 ? (
        <p>No contacts found. Add your first contact to get started.</p>
      ) : (
        <div>
          <p>Total contacts: {contacts.length}</p>
          {/* Contact list will be implemented here */}
        </div>
      )}
    </div>
  );
}

