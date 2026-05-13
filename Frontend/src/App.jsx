import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import GenerateCertificate from './components/GenerateCertificate';
import VerifyCertificate from './components/VerifyCertificate';
import "./App.css";

// Main Dashboard Component
function Dashboard() {
  const [activeTab, setActiveTab] = useState('verify');

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">🛡️</div>
          <h2>CertiSafe</h2>
        </div>
        <ul className="nav-links">
          <li className={activeTab === 'verify' ? 'active' : ''} onClick={() => setActiveTab('verify')}>
            <span>🔍</span> Verify Credential
          </li>
          <li className={activeTab === 'issue' ? 'active' : ''} onClick={() => setActiveTab('issue')}>
            <span>✍️</span> Issue Certificate
          </li>
        </ul>
        <div className="sidebar-footer">
          <p>Connected to Sepolia</p>
        </div>
      </nav>

      <main className="content">
        <header className="top-bar">
          <h1>{activeTab === 'verify' ? 'Public Verification Portal' : 'Administrator Dashboard'}</h1>
          <div className="user-profile">
            <span className="status-dot"></span> Admin Account
          </div>
        </header>

        <div className="view-container">
          {activeTab === 'verify' ? <VerifyCertificate /> : <GenerateCertificate />}
        </div>
      </main>
    </div>
  );
}

// Dedicated Public Verification View for QR Scanning
function PublicView() {
  const { id } = useParams();
  return (
    <div className="public-verify-page">
      <div className="container">
         <VerifyCertificate defaultId={id} autoVerify={true} />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/verify/:id" element={<PublicView />} />
      </Routes>
    </Router>
  );
}

export default App;
