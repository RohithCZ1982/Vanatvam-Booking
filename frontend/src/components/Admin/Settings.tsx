import React, { useState } from 'react';
import PropertyManagement from './PropertyManagement';
import CottageManagement from './CottageManagement';
import QuotaReset from './QuotaReset';
import HolidayConfiguration from './HolidayConfiguration';
import PeakSeasonManagement from './PeakSeasonManagement';
import './Settings.css';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'properties' | 'cottages' | 'quota-reset' | 'holidays' | 'peak-seasons'>('properties');

  return (
    <div className="card">
      <h2>Settings</h2>
      
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          🏠 Properties
        </button>
        <button
          className={`tab-button ${activeTab === 'cottages' ? 'active' : ''}`}
          onClick={() => setActiveTab('cottages')}
        >
          🏡 Cottages
        </button>
        <button
          className={`tab-button ${activeTab === 'quota-reset' ? 'active' : ''}`}
          onClick={() => setActiveTab('quota-reset')}
        >
          🔄 Quota Reset
        </button>
        <button
          className={`tab-button ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          🎉 Holidays
        </button>
        <button
          className={`tab-button ${activeTab === 'peak-seasons' ? 'active' : ''}`}
          onClick={() => setActiveTab('peak-seasons')}
        >
          📅 Peak Seasons
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'properties' && (
          <div className="settings-tab-content">
            <PropertyManagement />
          </div>
        )}
        {activeTab === 'cottages' && (
          <div className="settings-tab-content">
            <CottageManagement />
          </div>
        )}
        {activeTab === 'quota-reset' && (
          <div className="settings-tab-content">
            <QuotaReset />
          </div>
        )}
        {activeTab === 'holidays' && (
          <div className="settings-tab-content">
            <HolidayConfiguration />
          </div>
        )}
        {activeTab === 'peak-seasons' && (
          <div className="settings-tab-content">
            <PeakSeasonManagement />
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

