import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Settings.css';

interface EmailConfig {
  id?: number;
  smtp_server: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  frontend_url: string;
  enabled: boolean;
}

interface EmailTemplate {
  id?: number;
  template_type: string;
  subject: string;
  html_body: string;
  text_body?: string;
}

const EmailConfiguration: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'config' | 'templates'>('config');
  const [config, setConfig] = useState<EmailConfig>({
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    frontend_url: '',
    enabled: true
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchTemplates();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/api/admin/email-config');
      if (response.data && response.data.id) {
        // Config exists in database
        setConfig({
          ...response.data,
          smtp_password: '' // Don't show existing password, user needs to enter new one if changing
        });
      } else {
        // No config in database, use defaults
        setConfig({
          smtp_server: 'smtp.gmail.com',
          smtp_port: 587,
          smtp_username: '',
          smtp_password: '',
          from_email: '',
          frontend_url: window.location.origin,
          enabled: true
        });
      }
    } catch (err: any) {
      // If config doesn't exist yet, use defaults
      console.log('Email config not found, using defaults');
      setConfig({
        smtp_server: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        from_email: '',
        frontend_url: window.location.origin,
        enabled: true
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/admin/email-templates');
      const fetchedTemplates = response.data || [];
      
      // Ensure we have all 4 template types
      const templateTypes = ['registration', 'verification', 'approval', 'rejection'];
      const defaultTemplates = {
        'registration': { subject: 'Welcome to Vanatvam - Please Confirm Your Email', html_body: '', text_body: '' },
        'verification': { subject: 'Vanatvam - Email Verified Successfully', html_body: '', text_body: '' },
        'approval': { subject: 'Vanatvam - Account Approved!', html_body: '', text_body: '' },
        'rejection': { subject: 'Vanatvam - Registration Update', html_body: '', text_body: '' }
      };
      
      const allTemplates = templateTypes.map(type => {
        const existing = fetchedTemplates.find((t: EmailTemplate) => t.template_type === type);
        return existing || { template_type: type, ...defaultTemplates[type as keyof typeof defaultTemplates] };
      });
      
      setTemplates(allTemplates);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      // Initialize with default templates if none exist
      setTemplates([
        {
          template_type: 'registration',
          subject: 'Welcome to Vanatvam - Please Confirm Your Email',
          html_body: '',
          text_body: ''
        },
        {
          template_type: 'verification',
          subject: 'Vanatvam - Email Verified Successfully',
          html_body: '',
          text_body: ''
        },
        {
          template_type: 'approval',
          subject: 'Vanatvam - Account Approved!',
          html_body: '',
          text_body: ''
        },
        {
          template_type: 'rejection',
          subject: 'Vanatvam - Registration Update',
          html_body: '',
          text_body: ''
        }
      ]);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // If password is empty and config exists, send null instead of empty string
      const configToSend = {
        ...config,
        smtp_password: config.id && !config.smtp_password ? null : config.smtp_password
      };
      
      await api.post('/api/admin/email-config', configToSend);
      setSuccess('Email configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      // Reload config to get updated data
      fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpdate = async (template: EmailTemplate) => {
    if (!template.subject || !template.html_body) {
      setError('Subject and HTML body are required');
      return;
    }
    
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // If template has id, it exists, otherwise create it
      const payload = {
        subject: template.subject,
        html_body: template.html_body,
        ...(template.text_body && { text_body: template.text_body })
      };
      
      await api.put(`/api/admin/email-templates/${template.template_type}`, payload);
      setSuccess(`${getTemplateName(template.template_type)} template updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.post('/api/admin/email-config/test', { to_email: config.from_email || config.smtp_username });
      setSuccess('Test email sent successfully! Check your inbox.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send test email');
    } finally {
      setSaving(false);
    }
  };

  const getTemplateName = (type: string) => {
    const names: { [key: string]: string } = {
      'registration': 'Registration Confirmation',
      'verification': 'Email Verification',
      'approval': 'Account Approval',
      'rejection': 'Account Rejection'
    };
    return names[type] || type;
  };

  if (loading) {
    return <div>Loading email configuration...</div>;
  }

  return (
    <div>
      <div className="settings-tabs" style={{ marginBottom: '20px' }}>
        <button
          className={`tab-button ${activeSection === 'config' ? 'active' : ''}`}
          onClick={() => setActiveSection('config')}
        >
          📧 SMTP Configuration
        </button>
        <button
          className={`tab-button ${activeSection === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveSection('templates')}
        >
          ✉️ Email Templates
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {success}
        </div>
      )}

      {activeSection === 'config' && (
        <div>
          <h3 style={{ marginBottom: '10px' }}>SMTP Email Configuration</h3>
          <p style={{ marginBottom: '20px', color: '#6c757d', fontSize: '14px' }}>
            Configure SMTP settings for sending emails. For Gmail, you'll need to generate an App Password from your Google Account settings.
          </p>
          <form onSubmit={handleConfigSubmit}>
            <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  SMTP Server *
                </label>
                <input
                  type="text"
                  value={config.smtp_server}
                  onChange={(e) => setConfig({ ...config, smtp_server: e.target.value })}
                  placeholder="smtp.gmail.com"
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  SMTP Port *
                </label>
                <input
                  type="number"
                  value={config.smtp_port}
                  onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                  placeholder="587"
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  SMTP Username (Email) *
                </label>
                <input
                  type="email"
                  value={config.smtp_username}
                  onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
                  placeholder="your-email@gmail.com"
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  SMTP Password (App Password) {!config.id && '*'}
                </label>
                <input
                  type="password"
                  value={config.smtp_password}
                  onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                  placeholder={config.id ? "Leave empty to keep current password" : "Enter app password"}
                  required={!config.id}
                  className="input"
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>
                  {config.id ? 'Leave empty to keep current password. ' : ''}For Gmail, use App Password (not your regular password)
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  From Email Address *
                </label>
                <input
                  type="email"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                  placeholder="noreply@vanatvam.com"
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Frontend URL *
                </label>
                <input
                  type="url"
                  value={config.frontend_url}
                  onChange={(e) => setConfig({ ...config, frontend_url: e.target.value })}
                  placeholder="http://localhost:3000"
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  />
                  <span>Enable Email Sending</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={testEmail}
                  disabled={saving || !config.smtp_username}
                >
                  Send Test Email
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {activeSection === 'templates' && (
        <div>
          <h3 style={{ marginBottom: '10px' }}>Email Templates</h3>
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: '#e7f3ff', 
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: '500', color: '#333' }}>Available Variables:</p>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.8' }}>
              <code>{'{name}'}</code> - User's name<br />
              <code>{'{email}'}</code> - User's email<br />
              <code>{'{verification_url}'}</code> - Email verification link<br />
              <code>{'{property_name}'}</code> - Assigned property name<br />
              <code>{'{weekday_quota}'}</code> - Weekday quota amount<br />
              <code>{'{weekend_quota}'}</code> - Weekend quota amount<br />
              <code>{'{reason}'}</code> - Rejection reason (if applicable)
            </div>
          </div>
          
          {templates.map((template) => (
            <EmailTemplateEditor
              key={template.template_type}
              template={template}
              onSave={handleTemplateUpdate}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
  saving: boolean;
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ template, onSave, saving }) => {
  const [localTemplate, setLocalTemplate] = useState<EmailTemplate>(template);
  const [expanded, setExpanded] = useState(false);

  const templateNames: { [key: string]: string } = {
    'registration': 'Registration Confirmation Email',
    'verification': 'Email Verification Confirmation',
    'approval': 'Account Approval Email',
    'rejection': 'Account Rejection Email'
  };

  const handleSave = () => {
    onSave(localTemplate);
  };

  return (
    <div style={{ 
      marginBottom: '20px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px', 
      padding: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0 }}>{templateNames[template.template_type] || template.template_type}</h4>
        <button
          className="btn btn-secondary"
          onClick={() => setExpanded(!expanded)}
          style={{ padding: '5px 15px', minWidth: 'auto' }}
        >
          {expanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Subject *</label>
            <input
              type="text"
              value={localTemplate.subject}
              onChange={(e) => setLocalTemplate({ ...localTemplate, subject: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>HTML Body *</label>
            <textarea
              value={localTemplate.html_body}
              onChange={(e) => setLocalTemplate({ ...localTemplate, html_body: e.target.value })}
              rows={15}
              className="input"
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
              placeholder="Enter HTML email template..."
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Plain Text Body (Optional)</label>
            <textarea
              value={localTemplate.text_body || ''}
              onChange={(e) => setLocalTemplate({ ...localTemplate, text_body: e.target.value })}
              rows={10}
              className="input"
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
              placeholder="Enter plain text email template..."
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !localTemplate.subject || !localTemplate.html_body}
            style={{ justifySelf: 'start' }}
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailConfiguration;

