import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import abi from './CertificateManager.json';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCerts: 0,
    activeInstitutions: 0,
    totalRevoked: 0,
    recentCerts: [],
  });
  const [certsByType, setCertsByType] = useState({});
  const [certsByInstitution, setCertsByInstitution] = useState({});
  const [issuanceTrend, setIssuanceTrend] = useState({ labels: [], data: [] });

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const ContractABI = abi.abi;

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      const contract = new ethers.Contract(contractAddress, ContractABI, provider);

      // ── Get counts ──
      const certCount = Number(await contract.getCertificateCount());
      const instCount = Number(await contract.getInstitutionCount());

      // ── Get institutions ──
      let activeInsts = 0;
      const instMap = {};
      for (let i = 0; i < instCount; i++) {
        try {
          const [addr, name, isActive] = await contract.getInstitutionAt(i);
          if (isActive) activeInsts++;
          instMap[addr.toLowerCase()] = name || `Institution ${i + 1}`;
        } catch { /* skip */ }
      }

      // ── Fetch certificate details (limit to last 50 for performance) ──
      const startIdx = Math.max(0, certCount - 50);
      const typeCount = {};
      const instCertCount = {};
      const monthlyCount = {};
      let revokedCount = 0;
      const recentCerts = [];

      for (let i = startIdx; i < certCount; i++) {
        try {
          const certId = await contract.allCertificateIds(i);
          const result = await contract.verifyCertificate(certId);

          if (result.revoked) revokedCount++;

          // Institution tracking
          const issuerAddr = result.issuedBy?.toLowerCase();
          const issuerName = instMap[issuerAddr] || 'Unknown';
          instCertCount[issuerName] = (instCertCount[issuerName] || 0) + 1;

          // Issuance date tracking
          if (result.issuedAt) {
            const date = new Date(Number(result.issuedAt) * 1000);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
          }

          // Recent certs list
          if (i >= certCount - 5) {
            recentCerts.push({
              id: certId,
              issuer: result.issuer,
              revoked: result.revoked,
              issuedAt: result.issuedAt ? new Date(Number(result.issuedAt) * 1000).toLocaleDateString() : 'Unknown',
              institutionName: issuerName,
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch cert at index ${i}:`, err);
        }
      }

      // ── Type count from IPFS metadata (we'll estimate from IDs) ──
      for (let i = startIdx; i < certCount; i++) {
        try {
          const certId = await contract.allCertificateIds(i);
          const prefix = certId.split('-')[0]?.toUpperCase();
          const typeMap = { GRD: 'Graduation', CRS: 'Course', SKL: 'Skill', ACH: 'Achievement', INT: 'Internship' };
          const typeName = typeMap[prefix] || 'Other';
          typeCount[typeName] = (typeCount[typeName] || 0) + 1;
        } catch { /* skip */ }
      }

      // ── Build monthly trend ──
      const sortedMonths = Object.keys(monthlyCount).sort();
      setIssuanceTrend({
        labels: sortedMonths.map(m => {
          const [y, mo] = m.split('-');
          return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1]} ${y}`;
        }),
        data: sortedMonths.map(m => monthlyCount[m]),
      });

      setStats({ totalCerts: certCount, activeInstitutions: activeInsts, totalRevoked: revokedCount, recentCerts });
      setCertsByType(typeCount);
      setCertsByInstitution(instCertCount);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Chart Data ──
  const typeChartData = {
    labels: Object.keys(certsByType),
    datasets: [{
      data: Object.values(certsByType),
      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#6b7280'],
      borderWidth: 0,
    }],
  };

  const instChartData = {
    labels: Object.keys(certsByInstitution),
    datasets: [{
      label: 'Certificates Issued',
      data: Object.values(certsByInstitution),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 6,
    }],
  };

  const trendChartData = {
    labels: issuanceTrend.labels,
    datasets: [{
      label: 'Certificates Issued',
      data: issuanceTrend.data,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 11 } } } },
  };

  const barOptions = {
    ...chartOptions,
    plugins: { ...chartOptions.plugins, legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      x: { ticks: { font: { size: 10 } } },
    },
  };

  if (loading) {
    return (
      <div className="section">
        <div className="form-header">
          <h2>📊 Analytics Dashboard</h2>
          <p>Loading on-chain data...</p>
        </div>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="section">
      <div className="form-header">
        <h2>📊 Analytics Dashboard</h2>
        <p>Real-time insights powered by on-chain data from the Sepolia blockchain.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="analytics-stat-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-icon">📜</div>
          <div className="analytics-stat-value">{stats.totalCerts}</div>
          <div className="analytics-stat-label">Total Certificates</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-icon">🏛️</div>
          <div className="analytics-stat-value">{stats.activeInstitutions}</div>
          <div className="analytics-stat-label">Active Institutions</div>
        </div>
        <div className="analytics-stat-card revoked">
          <div className="analytics-stat-icon">🚫</div>
          <div className="analytics-stat-value">{stats.totalRevoked}</div>
          <div className="analytics-stat-label">Revoked Certificates</div>
        </div>
        <div className="analytics-stat-card success">
          <div className="analytics-stat-icon">✅</div>
          <div className="analytics-stat-value">{stats.totalCerts - stats.totalRevoked}</div>
          <div className="analytics-stat-label">Active Certificates</div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="analytics-charts-grid">
        {/* Doughnut — Types */}
        <div className="analytics-chart-card">
          <h3>Certificate Types</h3>
          <div className="analytics-chart-wrap" style={{ height: 250 }}>
            {Object.keys(certsByType).length > 0
              ? <Doughnut data={typeChartData} options={chartOptions} />
              : <p className="analytics-empty">No data available</p>
            }
          </div>
        </div>

        {/* Bar — Institutions */}
        <div className="analytics-chart-card">
          <h3>Certificates by Institution</h3>
          <div className="analytics-chart-wrap" style={{ height: 250 }}>
            {Object.keys(certsByInstitution).length > 0
              ? <Bar data={instChartData} options={barOptions} />
              : <p className="analytics-empty">No data available</p>
            }
          </div>
        </div>
      </div>

      {/* Line — Trend */}
      <div className="analytics-chart-card" style={{ marginTop: 16 }}>
        <h3>Issuance Trend</h3>
        <div className="analytics-chart-wrap" style={{ height: 220 }}>
          {issuanceTrend.labels.length > 0
            ? <Line data={trendChartData} options={{ ...barOptions, plugins: { legend: { display: false } } }} />
            : <p className="analytics-empty">No trend data yet</p>
          }
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="analytics-chart-card" style={{ marginTop: 16 }}>
        <h3>Recent Activity</h3>
        {stats.recentCerts.length === 0 && <p className="analytics-empty">No certificates issued yet</p>}
        <div className="analytics-activity-list">
          {stats.recentCerts.map((cert, i) => (
            <div key={i} className={`analytics-activity-item ${cert.revoked ? 'revoked' : ''}`}>
              <div className="analytics-activity-icon">{cert.revoked ? '🚫' : '📜'}</div>
              <div className="analytics-activity-info">
                <strong>{cert.id}</strong>
                <span>{cert.institutionName} · {cert.issuer}</span>
              </div>
              <div className="analytics-activity-date">{cert.issuedAt}</div>
              <div className={`analytics-activity-badge ${cert.revoked ? 'danger' : 'success'}`}>
                {cert.revoked ? 'Revoked' : 'Active'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
