import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [recentTrades, setRecentTrades] = useState([]);
  const [marketHalted, setMarketHalted] = useState(false);
  const [flashOn, setFlashOn] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('market_data', (data) => {
      if (data.type === 'CIRCUIT_BREAKER_TRIGGERED') {
        setMarketHalted(true);
        return;
      }

      if (data.type === 'trade' || data.price !== undefined) {
        setRecentTrades((prev) =>
          [...prev, { ...data, id: `${Date.now()}-${Math.random()}` }].slice(-50)
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!marketHalted) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setFlashOn((prev) => !prev);
    }, 500);

    return () => clearInterval(intervalId);
  }, [marketHalted]);

  const handleSimulateCrash = async () => {
    alert("Button clicked! Attempting to talk to server..."); // NEW: Proof of life
    setIsSimulating(true);
    try {
      const response = await fetch('http://localhost:3001/simulate-crash', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      console.log("Server response:", result);
      alert("Success! Server said: " + result.status);
    } catch (err) {
      console.error('Failed to simulate crash:', err);
      alert("Error: " + err.message); // NEW: If this fails, we see WHY
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        color: '#e6edf3',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: '24px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #30363d',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: '#58a6ff',
            }}
          >
            Live Order Book Engine
          </h1>
          <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '14px' }}>
            Real-time matching engine feed
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: marketHalted ? '#3d1214' : '#122117',
              color: marketHalted ? '#ff7b72' : '#3fb950',
              border: `1px solid ${marketHalted ? '#da3633' : '#238636'}`,
            }}
          >
            {marketHalted ? 'HALTED' : 'LIVE'}
          </span>

          <button
            type="button"
            onClick={handleSimulateCrash}
            disabled={isSimulating || marketHalted}
            style={{
              backgroundColor: isSimulating || marketHalted ? '#21262d' : '#da3633',
              color: '#ffffff',
              border: '1px solid #f85149',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSimulating || marketHalted ? 'not-allowed' : 'pointer',
              opacity: isSimulating || marketHalted ? 0.6 : 1,
            }}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Flash Crash'}
          </button>
        </div>
      </header>

      <section
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Recent Trades</h2>
          <span style={{ color: '#8b949e', fontSize: '13px' }}>
            Showing last {recentTrades.length} of 50
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#21262d', textAlign: 'left' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    color: '#8b949e',
                    fontWeight: 600,
                    borderBottom: '1px solid #30363d',
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    color: '#8b949e',
                    fontWeight: 600,
                    borderBottom: '1px solid #30363d',
                  }}
                >
                  Price
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    color: '#8b949e',
                    fontWeight: 600,
                    borderBottom: '1px solid #30363d',
                  }}
                >
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: '#8b949e',
                      borderBottom: '1px solid #30363d',
                    }}
                  >
                    Waiting for trades...
                  </td>
                </tr>
              ) : (
                [...recentTrades].reverse().map((trade, index) => (
                  <tr key={trade.id}>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: '#8b949e',
                        borderBottom: '1px solid #30363d',
                      }}
                    >
                      {recentTrades.length - index}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: '#58a6ff',
                        fontWeight: 600,
                        borderBottom: '1px solid #30363d',
                      }}
                    >
                      {trade.price}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: '#3fb950',
                        fontWeight: 600,
                        borderBottom: '1px solid #30363d',
                      }}
                    >
                      {trade.quantity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {marketHalted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: flashOn ? 'rgba(218, 54, 51, 0.92)' : 'rgba(139, 0, 0, 0.88)',
            zIndex: 9999,
            transition: 'background-color 0.2s ease',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              border: '4px solid #ffffff',
              borderRadius: '16px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              boxShadow: '0 0 40px rgba(255, 255, 255, 0.25)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(28px, 5vw, 56px)',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              CIRCUIT BREAKER TRIGGERED: TRADING HALTED
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
