import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';

interface Property {
  id: number;
  name: string;
}

interface Cottage {
  id: number;
  cottage_id: string;
  property_id: number;
  capacity: number;
  amenities: string;
  image_url: string | null;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CottageManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [cottages, setCottages] = useState<Cottage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    cottage_id: '',
    capacity: 2,
    amenities: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterProperty, setFilterProperty] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchProperties();
    fetchCottages();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/admin/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchCottages = async () => {
    try {
      const url = filterProperty
        ? `/api/admin/cottages?property_id=${filterProperty}`
        : '/api/admin/cottages';
      const response = await api.get(url);
      setCottages(response.data);
    } catch (error) {
      console.error('Error fetching cottages:', error);
    }
  };

  useEffect(() => {
    fetchCottages();
  }, [filterProperty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/api/admin/cottages/${editingId}`, {
          ...formData,
          property_id: parseInt(formData.property_id),
        });
      } else {
        await api.post('/api/admin/cottages', {
          ...formData,
          property_id: parseInt(formData.property_id),
        });
      }
      fetchCottages();
      setShowForm(false);
      setFormData({ property_id: '', cottage_id: '', capacity: 2, amenities: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving cottage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cottage: Cottage) => {
    setFormData({
      property_id: cottage.property_id.toString(),
      cottage_id: cottage.cottage_id,
      capacity: cottage.capacity,
      amenities: cottage.amenities || '',
    });
    setEditingId(cottage.id);
    setShowForm(true);
  };

  const handleImageUpload = async (cottageId: number, file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }

    setUploadingId(cottageId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/api/admin/cottages/${cottageId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      fetchCottages();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteImage = async (cottageId: number) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await api.delete(`/api/admin/cottages/${cottageId}/image`);
      fetchCottages();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent, cottageId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(cottageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, cottageId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageUpload(cottageId, files[0]);
    }
  };

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    // If already an absolute URL, return as-is
    if (imageUrl.startsWith('http')) return imageUrl;
    // Otherwise, prepend the API URL
    return `${API_URL}${imageUrl}`;
  };

  return (
    <div className="card">
      <h2>Cottage Inventory (ADM-07)</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>
          Filter by Sanctuary:
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="input"
            style={{ width: '200px', display: 'inline-block', marginLeft: '10px' }}
          >
            <option value="">All Sanctuaries</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn btn-primary"
        style={{ marginBottom: '20px', padding: '5px 10px', minWidth: 'auto' }}
        title={showForm ? 'Cancel' : 'Add Cottage'}
      >
        {showForm ? '↪️' : '➕'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <select
            value={formData.property_id}
            onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
            required
            className="input"
          >
            <option value="">Select Sanctuary</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Cottage ID (e.g., C-12)"
            value={formData.cottage_id}
            onChange={(e) => setFormData({ ...formData, cottage_id: e.target.value })}
            required
            className="input"
          />
          <input
            type="number"
            placeholder="Capacity"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
            required
            className="input"
          />
          <textarea
            placeholder="Amenities (comma-separated)"
            value={formData.amenities}
            onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
            className="input"
            rows={3}
          />
          <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px', marginBottom: '10px' }}>
            💡 You can upload an image after creating the cottage.
          </p>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            title={loading ? 'Saving...' : editingId ? 'Update Cottage' : 'Create Cottage'}
            style={{ padding: '5px 10px', minWidth: 'auto' }}
          >
            {loading ? '⏳' : editingId ? '💾' : '➕'}
          </button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Image</th>
            <th>ID</th>
            <th>Cottage ID</th>
            <th>Sanctuary</th>
            <th>Capacity</th>
            <th>Amenities</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cottages.map((cottage) => {
            const property = properties.find((p) => p.id === cottage.property_id);
            const imageUrl = getImageUrl(cottage.image_url);
            const isUploading = uploadingId === cottage.id;
            const isDragTarget = dragOver === cottage.id;

            return (
              <tr key={cottage.id}>
                <td style={{ width: '120px', verticalAlign: 'middle' }}>
                  <div
                    onDragOver={(e) => handleDragOver(e, cottage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cottage.id)}
                    style={{
                      width: '100px',
                      height: '75px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      border: isDragTarget
                        ? '2px dashed #007bff'
                        : imageUrl
                          ? '1px solid #dee2e6'
                          : '2px dashed #ced4da',
                      backgroundColor: isDragTarget
                        ? 'rgba(0, 123, 255, 0.05)'
                        : imageUrl
                          ? '#f8f9fa'
                          : '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => {
                      if (imageUrl) {
                        setPreviewImage(imageUrl);
                      } else {
                        fileInputRefs.current[cottage.id]?.click();
                      }
                    }}
                  >
                    {isUploading ? (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid #dee2e6',
                          borderTop: '3px solid #007bff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          margin: '0 auto 4px'
                        }} />
                        Uploading...
                      </div>
                    ) : imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Cottage ${cottage.cottage_id}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size: 24px;">🏠</span>';
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#adb5bd', padding: '5px' }}>
                        <div style={{ fontSize: '20px', marginBottom: '2px' }}>📷</div>
                        {isDragTarget ? 'Drop here' : 'Click or drag'}
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    ref={(el) => (fileInputRefs.current[cottage.id] = el)}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(cottage.id, file);
                      }
                      e.target.value = '';
                    }}
                  />

                  {imageUrl && (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      marginTop: '4px',
                      justifyContent: 'center'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[cottage.id]?.click();
                        }}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          backgroundColor: '#f8f9fa',
                          cursor: 'pointer',
                          color: '#495057',
                        }}
                        title="Change image"
                      >
                        🔄
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(cottage.id);
                        }}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          border: '1px solid #f5c6cb',
                          borderRadius: '4px',
                          backgroundColor: '#f8d7da',
                          cursor: 'pointer',
                          color: '#721c24',
                        }}
                        title="Delete image"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
                <td>{cottage.id}</td>
                <td>{cottage.cottage_id}</td>
                <td>{property?.name}</td>
                <td>{cottage.capacity}</td>
                <td>{cottage.amenities}</td>
                <td>
                  <button
                    onClick={() => handleEdit(cottage)}
                    className="btn btn-secondary"
                    title="Edit Cottage"
                    style={{ padding: '5px 10px', minWidth: 'auto' }}
                  >
                    ✏️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
            padding: '40px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewImage}
              alt="Cottage Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#dc3545',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CottageManagement;
