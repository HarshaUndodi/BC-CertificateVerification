import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GenerateCertificate from './components/GenerateCertificate';
import VerifyCertificate from './components/VerifyCertificate';
import PublicVerify from './components/PublicVerify';
import "./App.css";

// Main Dashboard Component
function Dashboard() {
  const [activeTab, setActiveTab] = useState('verify');
  const [isAdmin, setIsAdmin] = useState(false);
  const adminAddress = "0x5bD0005b3ee7e7a64425d1838396DD5de9122078";

  React.useEffect(() => {
    const checkAdmin = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0 && accounts[0].toLowerCase() === adminAddress.toLowerCase()) {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
  }, []);

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
            <span className={`status-dot ${isAdmin ? 'admin-active' : ''}`}></span> 
            {isAdmin ? 'Admin Authorized' : 'Guest Mode'}
          </div>
        </header>

        <div className="view-container">
          {activeTab === 'verify' ? <VerifyCertificate /> : <GenerateCertificate />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/verify/:id" element={<PublicVerify />} />
      </Routes>
    </Router>
  );
}

export default App;

