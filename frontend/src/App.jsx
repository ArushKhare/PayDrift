import { useState, useEffect } from 'react'
import { api } from './services/api'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Test the Round Trip
    async function fetchData() {
      try {
        const result = await api.getDrift()
        console.log("✅ API Round Trip Successful. Data received:", result)
        setData(result)
      } catch (err) {
        console.error("❌ API Call Failed", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="card">
      <h1>Drift Detector</h1>
      {loading && <p>Loading demo data...</p>}
      
      {data && (
        <div style={{textAlign: 'left'}}>
          <p><strong>✅ Backend Connected</strong></p>
          <p>Payroll Rows: {data.payroll_rows}</p>
          <p>AI Cost Rows: {data.ai_costs_rows}</p>
          <p>SaaS Rows: {data.saas_cloud_rows}</p>
          <p style={{fontSize: '0.8em', color: '#666'}}>
            Check console for full JSON response.
          </p>
        </div>
      )}
    </div>
  )
}

export default App