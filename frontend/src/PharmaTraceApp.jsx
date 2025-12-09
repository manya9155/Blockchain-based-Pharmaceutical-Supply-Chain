import React, { useState } from "react";

const API_BASE = "http://localhost:5000/api";

function formatTimestamp(ts) {
  if (!ts) return "";
  const date = new Date(ts * 1000);
  return date.toLocaleString();
}

export default function PharmaTraceApp() {
  // ---------- STATE ----------
  const [createData, setCreateData] = useState({
    batch_id: "",
    drug_name: "",
    dosage_form: "",
    strength: "",
    manufacturer: "",
    mfg_date: "",
    exp_date: "",
    first_location: "",
  });

  const [transferData, setTransferData] = useState({
    batch_id: "",
    to: "",
    location: "",
    note: "",
  });

  const [statusData, setStatusData] = useState({
    batch_id: "",
    status: "0",
  });

  const [queryBatchId, setQueryBatchId] = useState("");
  const [batchInfo, setBatchInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // NEW: tx hash state
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  // ---------- HELPERS ----------
  const handleChangeCreate = (e) => {
    const { name, value } = e.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeTransfer = (e) => {
    const { name, value } = e.target;
    setTransferData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeStatus = (e) => {
    const { name, value } = e.target;
    setStatusData((prev) => ({ ...prev, [name]: value }));
  };

  const clearMessages = () => {
    setMessage("");
    setError("");
    setCopied(false);
  };

  const copyHash = async () => {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      alert("Unable to copy. Please copy manually.");
    }
  };

  function normalizeHash(h) {
    if (!h) return "";
    return h.startsWith("0x") ? h : "0x" + h;
  }

  // ---------- API CALLS ----------
  const createBatch = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const body = {
        ...createData,
        mfg_date: Math.floor(new Date(createData.mfg_date).getTime() / 1000),
        exp_date: Math.floor(new Date(createData.exp_date).getTime() / 1000),
      };

      const res = await fetch(`${API_BASE}/create_batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create batch");
      }

      setMessage("Batch created successfully!");
      if (data.tx_hash){
        const rawHash = data.tx_hash;
        const normalized = normalizeHash(rawHash);
        setTxHash(normalized);
    }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const transferBatch = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/transfer_batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to transfer batch");
      }

      setMessage("Batch transferred!");
      if (data.tx_hash){
        const rawHash = data.tx_hash;
        const normalized = normalizeHash(rawHash);
        setTxHash(normalized);
    }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const body = {
        batch_id: statusData.batch_id,
        status: parseInt(statusData.status, 10),
      };

      const res = await fetch(`${API_BASE}/update_status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setMessage("Status updated!");
      if (data.tx_hash){
        const rawHash = data.tx_hash;
        const normalized = normalizeHash(rawHash);
        setTxHash(normalized);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchInfo = async () => {
    clearMessages();
    setLoading(true);
    setBatchInfo(null);
    try {
      const res = await fetch(
        `${API_BASE}/get_batch?batch_id=${encodeURIComponent(queryBatchId)}`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Batch not found");
      }
      setBatchInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    clearMessages();
    setLoading(true);
    setHistory([]);
    try {
      const res = await fetch(
        `${API_BASE}/get_history?batch_id=${encodeURIComponent(queryBatchId)}`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch history");
      }
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- RENDER ----------
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>PharmaTraceability Dashboard</h1>
      <p style={styles.subtitle}>
        Blockchain-based traceability for pharmaceutical batches (Sepolia testnet)
      </p>

      {loading && <p style={styles.info}>⏳ Processing transaction on blockchain...</p>}
      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>⚠ {error}</p>}

      {/* Transaction hash card */}
      {txHash && (
        <div style={styles.txCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#93c5fd", fontWeight: 700 }}>Blockchain Transaction</div>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={styles.txLink}
              >
                {txHash}
              </a>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={copyHash} style={styles.copyBtn}>
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={styles.viewBtn}
              >
                View
              </a>
            </div>
          </div>
        </div>
      )}

      <div style={styles.grid}>
        {/* Create Batch */}
        <section style={styles.card}>
          <h2>Create Batch</h2>
          <form onSubmit={createBatch} style={styles.form}>
            <input
              type="text"
              name="batch_id"
              placeholder="Batch ID (e.g., BATCH001)"
              value={createData.batch_id}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="drug_name"
              placeholder="Drug Name"
              value={createData.drug_name}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="dosage_form"
              placeholder="Dosage Form (e.g., Tablet)"
              value={createData.dosage_form}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="strength"
              placeholder="Strength (e.g., 500mg)"
              value={createData.strength}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="manufacturer"
              placeholder="Manufacturer Name"
              value={createData.manufacturer}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <label style={styles.label}>Manufacturing Date</label>
            <input
              type="date"
              name="mfg_date"
              value={createData.mfg_date}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <label style={styles.label}>Expiry Date</label>
            <input
              type="date"
              name="exp_date"
              value={createData.exp_date}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="first_location"
              placeholder="First Location (e.g., Mumbai Plant)"
              value={createData.first_location}
              onChange={handleChangeCreate}
              required
              style={styles.input}
            />
            <button type="submit" style={styles.button}>
              Create Batch
            </button>
          </form>
        </section>

        {/* Transfer Batch */}
        <section style={styles.card}>
          <h2>Transfer Batch</h2>
          <form onSubmit={transferBatch} style={styles.form}>
            <input
              type="text"
              name="batch_id"
              placeholder="Batch ID (e.g., BATCH001)"
              value={transferData.batch_id}
              onChange={handleChangeTransfer}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="to"
              placeholder="Receiver Address (0x...)"
              value={transferData.to}
              onChange={handleChangeTransfer}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="location"
              placeholder="New Location"
              value={transferData.location}
              onChange={handleChangeTransfer}
              required
              style={styles.input}
            />
            <input
              type="text"
              name="note"
              placeholder="Note (e.g., Shipped via cold chain)"
              value={transferData.note}
              onChange={handleChangeTransfer}
              required
              style={styles.input}
            />
            <button type="submit" style={styles.button}>
              Transfer
            </button>
          </form>

          <h2 style={{ marginTop: "2rem" }}>Update Status</h2>
          <form onSubmit={updateStatus} style={styles.form}>
            <input
              type="text"
              name="batch_id"
              placeholder="Batch ID (e.g., BATCH001)"
              value={statusData.batch_id}
              onChange={handleChangeStatus}
              required
              style={styles.input}
            />
            <select
              name="status"
              value={statusData.status}
              onChange={handleChangeStatus}
              style={styles.input}
            >
              <option value="0">Active</option>
              <option value="1">Recalled</option>
              <option value="2">Dispensed</option>
            </select>
            <button type="submit" style={styles.button}>
              Update Status
            </button>
          </form>
        </section>
      </div>

      {/* Query + History */}
      <section style={styles.cardWide}>
        <h2>Query Batch & History</h2>
        <div style={styles.queryRow}>
          <input
            type="text"
            placeholder="Batch ID (e.g., BATCH001)"
            value={queryBatchId}
            onChange={(e) => setQueryBatchId(e.target.value)}
            style={{ ...styles.input, maxWidth: "300px" }}
          />
          <button onClick={fetchBatchInfo} style={styles.buttonSmall}>
            Get Batch
          </button>
          <button onClick={fetchHistory} style={styles.buttonSmall}>
            Get History
          </button>
        </div>

        {batchInfo && (
          <div style={styles.batchBox}>
            <h3>Batch Details</h3>
            <p><strong>Drug:</strong> {batchInfo.drug_name}</p>
            <p><strong>Dosage Form:</strong> {batchInfo.dosage_form}</p>
            <p><strong>Strength:</strong> {batchInfo.strength}</p>
            <p><strong>Manufacturer:</strong> {batchInfo.manufacturer}</p>
            <p><strong>Manufactured:</strong> {formatTimestamp(batchInfo.mfg_date)}</p>
            <p><strong>Expiry:</strong> {formatTimestamp(batchInfo.exp_date)}</p>
            <p><strong>Current Owner:</strong> {batchInfo.current_owner}</p>
            <p>
              <strong>Status:</strong>{" "}
              {batchInfo.status === 0
                ? "Active"
                : batchInfo.status === 1
                ? "Recalled"
                : "Dispensed"}
            </p>
          </div>
        )}

        {history.length > 0 && (
          <div style={styles.historyBox}>
            <h3>Transfer History</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Time</th>
                  <th>Location</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={idx}>
                    <td>{h.from}</td>
                    <td>{h.to}</td>
                    <td>{formatTimestamp(h.timestamp)}</td>
                    <td>{h.location}</td>
                    <td>{h.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// Simple inline styles to make it look decent without CSS files
const styles = {
  container: {
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "20px",
    background: "#0f172a",
    minHeight: "100vh",
    color: "#e5e7eb",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "0.25rem",
  },
  subtitle: {
    color: "#9ca3af",
    marginBottom: "1.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#020617",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #1f2937",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
  },
  cardWide: {
    marginTop: "20px",
    background: "#020617",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #1f2937",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
  },
  input: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#e5e7eb",
    outline: "none",
  },
  label: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    marginTop: "4px",
  },
  button: {
    marginTop: "8px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#f9fafb",
    cursor: "pointer",
    fontWeight: "500",
  },
  buttonSmall: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "none",
    background: "#22c55e",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: "500",
    marginLeft: "8px",
  },
  info: {
    color: "#a5b4fc",
    marginBottom: "8px",
  },
  success: {
    color: "#4ade80",
    marginBottom: "8px",
  },
  error: {
    color: "#f97373",
    marginBottom: "8px",
  },
  queryRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "16px",
  },
  batchBox: {
    marginTop: "12px",
    padding: "12px",
    borderRadius: "8px",
    background: "#020617",
    border: "1px solid #1f2937",
  },
  historyBox: {
    marginTop: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },

  // tx card styles
  txCard: {
    padding: "12px",
    marginTop: "12px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #0b1220, #071125)",
    border: "1px solid #1f2a44",
    color: "#e6eef8",
    fontSize: "0.95rem",
    wordBreak: "break-all",
  },
  txLink: {
    color: "#a78bfa",
    fontFamily: "monospace",
    textDecoration: "underline",
    display: "block",
    marginTop: 6,
  },
  copyBtn: {
    background: "#10b981",
    border: "none",
    color: "#021124",
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
  viewBtn: {
    background: "#1e40af",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
    fontWeight: 600,
  },
};
