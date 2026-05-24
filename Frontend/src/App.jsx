import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ethers } from 'ethers';
import GenerateCertificate from './components/GenerateCertificate';
import VerifyCertificate from './components/VerifyCertificate';
import PublicVerify from './components/PublicVerify';
import InstitutionManager from './components/InstitutionManager';
import RevokeCertificate from './components/RevokeCertificate';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import abi from './components/CertificateManager.json';
import "./App.css";

// Main Dashboard Component
function Dashboard() {
  const [activeTab, setActiveTab] = useState('verify');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInstitution, setIsInstitution] = useState(false);
  const [connectedAddr, setConnectedAddr] = useState('');
  const [institutionName, setInstitutionName] = useState('');

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  useEffect(() => {
    checkAccess();
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkAccess);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkAccess);
      }
    };
  }, []);

  const checkAccess = async () => {
    try {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) return;

      const addr = accounts[0];
      setConnectedAddr(addr);

      // Use public provider for read-only check
      const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      const contract = new ethers.Contract(contractAddress, ContractABI, provider);

      // Check if owner
      const owner = await contract.getOwner();
      const isOwner = owner.toLowerCase() === addr.toLowerCase();
      setIsAdmin(isOwner);

      // Check if institution
      const instActive = await contract.isInstitution(addr);
      setIsInstitution(instActive);

      // Get institution name
      if (instActive) {
        const inst = await contract.institutions(addr);
        setInstitutionName(inst.name || 'Institution');
      }
    } catch (err) {
      console.warn('Access check failed:', err);
    }
  };

  const tabTitle = {
    verify: 'Public Verification Portal',
    issue: 'Issue Certificate',
    revoke: 'Revoke Certificate',
    institutions: 'Institution Registry',
    analytics: 'Analytics Dashboard',
  };

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">🛡️</div>
          <h2>CertiSafe</h2>
        </div>

        <ul className="nav-links">
          {/* Public */}
          <li className={activeTab === 'verify' ? 'active' : ''} onClick={() => setActiveTab('verify')}>
            <span>🔍</span> Verify Credential
          </li>

          {/* Institution / Admin */}
          {isInstitution && (
            <li className={activeTab === 'issue' ? 'active' : ''} onClick={() => setActiveTab('issue')}>
              <span>✍️</span> Issue Certificate
            </li>
          )}

          {(isAdmin || isInstitution) && (
            <li className={activeTab === 'revoke' ? 'active' : ''} onClick={() => setActiveTab('revoke')}>
              <span>🚫</span> Revoke Certificate
            </li>
          )}

          {/* Owner Only */}
          {isAdmin && (
            <li className={activeTab === 'institutions' ? 'active' : ''} onClick={() => setActiveTab('institutions')}>
              <span>🏛️</span> Institutions
            </li>
          )}

          {/* Analytics — Admin Only */}
          {isAdmin && (
            <li className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
              <span>📊</span> Analytics
            </li>
          )}
        </ul>

        <div className="sidebar-footer">
          <p>Connected to Sepolia</p>
          {isAdmin && <p className="sidebar-role admin-role">👑 Platform Owner</p>}
          {isInstitution && !isAdmin && <p className="sidebar-role inst-role">🏛️ {institutionName}</p>}
          {!isInstitution && !isAdmin && <p className="sidebar-role">👤 Guest</p>}
        </div>
      </nav>

      <main className="content">
        <header className="top-bar">
          <h1>{tabTitle[activeTab] || 'Dashboard'}</h1>
          <div className="user-profile">
            <span className={`status-dot ${isAdmin ? 'admin-active' : isInstitution ? 'inst-active' : ''}`}></span>
            {isAdmin ? 'Admin Authorized' : isInstitution ? institutionName : 'Guest Mode'}
            {connectedAddr && (
              <span className="connected-addr">{connectedAddr.substring(0, 6)}...{connectedAddr.substring(38)}</span>
            )}
          </div>
        </header>

        <div className="view-container">
          {activeTab === 'verify' && <VerifyCertificate />}
          {activeTab === 'issue' && <GenerateCertificate />}
          {activeTab === 'revoke' && <RevokeCertificate />}
          {activeTab === 'institutions' && <InstitutionManager />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
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
