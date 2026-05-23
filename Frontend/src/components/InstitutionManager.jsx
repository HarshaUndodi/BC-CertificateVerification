import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';

function InstitutionManager() {
  const [newAddr, setNewAddr] = useState('');
  const [newName, setNewName] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  // ── Load institutions ──────────────────────────────────
  useEffect(() => { loadInstitutions(); }, []);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const { signer } = await getBlockchain(false);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const count = await contract.getInstitutionCount();
      const list = [];
      for (let i = 0; i < Number(count); i++) {
        const [addr, name, isActive, registeredAt] = await contract.getInstitutionAt(i);
        list.push({
          address: addr,
          name,
          isActive,
          registeredAt: new Date(Number(registeredAt) * 1000).toLocaleDateString(),
        });
      }
      setInstitutions(list);
    } catch (err) {
      console.error('Failed to load institutions:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!newAddr || !newName) { alert('Please fill all fields'); return; }
    if (!ethers.isAddress(newAddr)) { alert('Invalid Ethereum address'); return; }

    setActionLoading(true);
    try {
      const { signer } = await getBlockchain(true);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const tx = await contract.registerInstitution(newAddr, newName);
      await tx.wait();
      alert(`✅ Institution "${newName}" registered!`);
      setNewAddr('');
      setNewName('');
      await loadInstitutions();
    } catch (err) {
      console.error(err);
      alert('Registration failed: ' + (err.reason || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Revoke ─────────────────────────────────────────────
  const handleRevoke = async (addr, name) => {
    if (!window.confirm(`Are you sure you want to revoke "${name}" (${addr})?`)) return;
    setActionLoading(true);
    try {
      const { signer } = await getBlockchain(true);
      const contract = new ethers.Contract(contractAddress, ContractABI, signer);
      const tx = await contract.revokeInstitution(addr);
      await tx.wait();
      alert(`❌ Institution "${name}" access revoked.`);
      await loadInstitutions();
    } catch (err) {
      console.error(err);
      alert('Revocation failed: ' + (err.reason || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="form-header">
        <h2>🏛️ Institution Registry</h2>
        <p>Register verified institutions that can issue certificates on the blockchain.</p>
      </div>

      {/* ── Register Form ── */}
      <form onSubmit={handleRegister} className="admin-form">
        <div className="form-section-title">Register New Institution</div>

        <div className="form-group">
          <label className="form-label">Institution Name *</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. IIT Bengaluru, MIT, Stanford"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Wallet Address *</label>
          <input
            type="text"
            value={newAddr}
            onChange={e => setNewAddr(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <button type="submit" disabled={actionLoading}>
          {actionLoading ? <><div className="loading-spinner" style={{ width: 20, height: 20, display: 'inline-block', marginRight: 8 }} />Processing...</> : '🏛️ Register Institution'}
        </button>
      </form>

      {/* ── Institution List ── */}
      <div style={{ marginTop: 32 }}>
        <div className="form-section-title">Registered Institutions ({institutions.length})</div>

        {loading && <div className="loading-spinner" />}

        {!loading && institutions.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            No institutions registered yet.
          </p>
        )}

        <div className="institution-list">
          {institutions.map((inst, i) => (
            <div key={i} className={`institution-card ${!inst.isActive ? 'revoked' : ''}`}>
              <div className="institution-info">
                <div className="institution-name-row">
                  <span className={`institution-status-dot ${inst.isActive ? 'active' : 'inactive'}`} />
                  <strong>{inst.name}</strong>
                  {!inst.isActive && <span className="revoked-badge-small">REVOKED</span>}
                </div>
                <div className="institution-address">{inst.address}</div>
                <div className="institution-meta">Registered: {inst.registeredAt}</div>
              </div>
              {inst.isActive && (
                <button
                  className="btn-danger-outline"
                  onClick={() => handleRevoke(inst.address, inst.name)}
                  disabled={actionLoading}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InstitutionManager;
