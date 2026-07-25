// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import ApexCharts from 'apexcharts';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';

// const SalesChart = ({ companyId, companyName, fiscalYearJson }) => {
//   const { salesChartDraftSave, setSalesChartDraftSave } = usePageNotRefreshContext();
  
//   // Get API base URL from environment variable
//   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';
  
//   const chartRef = useRef(null);
//   const chartInstance = useRef(null);
//   const [loading, setLoading] = useState(!salesChartDraftSave);
//   const [error, setError] = useState(null);
//   const { currentCompany } = useAuth();
//   const [dataStatus, setDataStatus] = useState(salesChartDraftSave ? 'cached' : 'loading');
//   const [autoRefresh] = useState(true);
//   const abortControllerRef = useRef(null);
//   const isFirstRender = useRef(true);

//   const chartOptions = {
//     series: [{ name: 'Net Sales', data: [] }],
//     chart: {
//       height: 220,
//       type: 'area',
//       toolbar: { 
//         show: true, 
//         tools: { 
//           download: true, 
//           selection: false, 
//           zoom: true, 
//           zoomin: false, 
//           zoomout: false, 
//           reset: true 
//         },
//         offsetX: -5,
//         offsetY: -5
//       },
//       zoom: { enabled: true },
//       animations: { enabled: false },
//       sparkline: { enabled: false }
//     },
//     colors: ['#0d6efd'],
//     dataLabels: { enabled: false },
//     stroke: { 
//       curve: 'smooth', 
//       width: 2.5, 
//       colors: ['#0d6efd'] 
//     },
//     fill: { 
//       type: 'gradient', 
//       gradient: { 
//         shadeIntensity: 1, 
//         opacityFrom: 0.5, 
//         opacityTo: 0.1, 
//         stops: [0, 90, 100] 
//       } 
//     },
//     xaxis: { 
//       categories: [], 
//       labels: { 
//         style: { 
//           colors: '#6c757d',
//           fontSize: '10px',
//           fontWeight: 400
//         },
//         offsetY: -3
//       },
//       axisBorder: { show: false },
//       axisTicks: { show: false }
//     },
//     yaxis: {
//       labels: {
//         formatter: (val) => {
//           if (val >= 10000000) return 'Rs. ' + (val / 10000000).toFixed(1) + 'Cr';
//           if (val >= 100000) return 'Rs. ' + (val / 100000).toFixed(1) + 'L';
//           if (val >= 1000) return 'Rs. ' + (val / 1000).toFixed(1) + 'K';
//           return 'Rs. ' + val.toLocaleString();
//         },
//         style: { 
//           colors: '#6c757d',
//           fontSize: '9px',
//           fontWeight: 400
//         },
//         offsetX: -5
//       },
//       axisBorder: { show: false },
//       axisTicks: { show: false }
//     },
//     tooltip: { 
//       y: { 
//         formatter: (val) => 'Rs. ' + val.toLocaleString() 
//       },
//       style: { 
//         fontSize: '11px',
//         fontFamily: 'Inter, system-ui, sans-serif'
//       },
//       theme: 'light'
//     },
//     grid: { 
//       borderColor: '#f1f1f1', 
//       strokeDashArray: 4,
//       padding: {
//         left: 0,
//         right: 0,
//         top: 5,
//         bottom: 5
//       }
//     },
//     legend: { show: false }
//   };

//   const initChart = () => {
//     if (chartRef.current && !chartInstance.current) {
//       chartInstance.current = new ApexCharts(chartRef.current, chartOptions);
//       chartInstance.current.render();
//     }
//   };

//   const updateChart = (categories, seriesData) => {
//     if (!chartInstance.current) initChart();
//     if (chartInstance.current) {
//       chartInstance.current.updateOptions({
//         series: [{ data: seriesData }],
//         xaxis: { categories }
//       }, false, true);
//     }
//   };

//   const fetchData = useCallback(async (force = false) => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }
    
//     abortControllerRef.current = new AbortController();
    
//     try {
//       if (force || !salesChartDraftSave) {
//         setLoading(true);
//       }
//       setError(null);

//       const params = new URLSearchParams();
//       if (companyId) params.append('companyId', companyId);
//       if (companyName) params.append('companyName', companyName);
//       if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

//       const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;
      
//       console.log('Fetching chart data from:', url);

//       const response = await axios.get(url, {
//         headers: { 
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         },
//         withCredentials: true,
//         signal: abortControllerRef.current.signal
//       });

//       if (response.data.success) {
//         const { chartData } = response.data.data;
//         updateChart(chartData.categories, chartData.series[0].data);
//         setSalesChartDraftSave({ categories: chartData.categories, seriesData: chartData.series[0].data });
//         setDataStatus('fresh');
//       } else {
//         throw new Error(response.data.error || 'Failed to load data');
//       }
//     } catch (err) {
//       if (err.name === 'AbortError') {
//         console.log('Fetch aborted');
//         return;
//       }
      
//       console.error('Chart data error:', err);
//       setError(err.response?.data?.error || err.message);
//       setDataStatus('error');
//       if (!salesChartDraftSave) updateChart(['No Data'], [0]);
//     } finally {
//       setLoading(false);
//     }
//   }, [companyId, companyName, fiscalYearJson, salesChartDraftSave, setSalesChartDraftSave, API_BASE_URL]);

//   const refreshData = () => {
//     fetchData(true);
//   };

//   // Initialize chart only once
//   useEffect(() => {
//     if (!companyId || !currentCompany) return;
    
//     initChart();
    
//     return () => {
//       chartInstance.current?.destroy();
//       chartInstance.current = null;
//     };
//   }, [companyId, currentCompany]);

//   // Handle data fetching
//   useEffect(() => {
//     if (!companyId || !currentCompany) return;

//     if (salesChartDraftSave) {
//       updateChart(salesChartDraftSave.categories, salesChartDraftSave.seriesData);
//       setDataStatus('cached');
//     }

//     if (isFirstRender.current) {
//       isFirstRender.current = false;
//       fetchData(!salesChartDraftSave);
//     } else {
//       if (salesChartDraftSave) {
//         fetchData(true);
//       } else {
//         fetchData(false);
//       }
//     }

//     let interval;
//     if (autoRefresh) {
//       interval = setInterval(() => {
//         console.log('Auto-refreshing chart data...');
//         fetchData(true);
//       }, 300000);
//     }

//     return () => {
//       if (interval) {
//         clearInterval(interval);
//       }
//       if (abortControllerRef.current) {
//         abortControllerRef.current.abort();
//       }
//     };
//   }, [companyId, currentCompany, fiscalYearJson]);

//   if (loading && !salesChartDraftSave) {
//     return (
//       <div className="card border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
//         <div className="card-header border-0 bg-transparent py-2 px-3">
//           <h6 className="card-title mb-0" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f2f5f8' }}>
//             <i className="bi bi-graph-up me-2" style={{ color: '#f1f2f4' }}></i>
//             Sales Overview
//           </h6>
//         </div>
//         <div className="card-body text-center py-4">
//           <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
//           <small className="d-block mt-2 text-muted" style={{ fontSize: '0.75rem' }}>Loading chart...</small>
//         </div>
//       </div>
//     );
//   }

//   if (error && !salesChartDraftSave) {
//     return (
//       <div className="card border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
//         <div className="card-header border-0 bg-transparent py-2 px-3">
//           <h6 className="card-title mb-0" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f2f5f8' }}>
//             <i className="bi bi-graph-up me-2" style={{ color: '#f1f2f4' }}></i>
//             Sales Overview
//           </h6>
//         </div>
//         <div className="card-body p-3">
//           <div className="alert alert-danger mb-0 py-2 d-flex align-items-center">
//             <i className="bi bi-exclamation-triangle me-2"></i>
//             <small className="flex-grow-1">{error}</small>
//             <button className="btn btn-sm btn-outline-danger py-0 px-2 ms-2" onClick={refreshData}>
//               <i className="bi bi-arrow-clockwise"></i>
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="card border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
//       <div className="card-header border-0 bg-transparent py-2 px-3 d-flex justify-content-between align-items-center">
//         <h6 className="card-title mb-0" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f2f5f8' }}>
//           <i className="bi bi-graph-up me-2" style={{ color: '#f1f2f4' }}></i>
//           Sales Overview
//         </h6>
//         <button 
//           className="btn btn-sm btn-outline-secondary py-0 px-2"
//           onClick={refreshData}
//           disabled={loading}
//           style={{ 
//             fontSize: '0.7rem',
//             borderRadius: '6px',
//             borderColor: '#dee2e6',
//             color: '#f2f5f8'
//           }}
//         >
//           <i className="bi bi-arrow-clockwise me-1"></i> Refresh
//         </button>
//       </div>
//       <div className="card-body pt-0 pb-1 px-2">
//         <div id="revenue-chart" ref={chartRef}></div>
//         {dataStatus === 'cached' && (
//           <div className="text-end mt-0">
//             <small className="text-muted" style={{ fontSize: '0.6rem' }}>
//               <i className="bi bi-clock-history me-1"></i>
//               Cached
//             </small>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SalesChart;

//-----------------------------------------------------end

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ApexCharts from 'apexcharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const SalesChart = ({ companyId, companyName, fiscalYearJson }) => {
  const { salesChartDraftSave, setSalesChartDraftSave } = usePageNotRefreshContext();
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';
  
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(!salesChartDraftSave);
  const [error, setError] = useState(null);
  const { currentCompany } = useAuth();
  const [dataStatus, setDataStatus] = useState(salesChartDraftSave ? 'cached' : 'loading');
  const [autoRefresh] = useState(true);
  const abortControllerRef = useRef(null);
  const isFirstRender = useRef(true);

  // Professional chart styles
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #e8ecf1',
      height: '100%',
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid #e8ecf1',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a202c',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    refreshButton: {
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#4a5568',
      backgroundColor: 'transparent',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    refreshButtonHover: {
      backgroundColor: '#f7fafc',
      borderColor: '#2563eb',
      color: '#2563eb',
    },
    body: {
      padding: '12px 16px 8px 16px',
    },
    chartWrapper: {
      width: '100%',
      minHeight: '220px',
    },
    loadingState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0',
      minHeight: '220px',
    },
    errorState: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: '#fef2f2',
      borderRadius: '8px',
      border: '1px solid #fecaca',
    },
    errorText: {
      color: '#dc2626',
      fontSize: '13px',
      margin: 0,
    },
    cachedIndicator: {
      textAlign: 'right',
      fontSize: '11px',
      color: '#a0aec0',
      marginTop: '4px',
    },
  };

  const chartOptions = {
    series: [{ name: 'Net Sales', data: [] }],
    chart: {
      height: 220,
      type: 'area',
      toolbar: { 
        show: true, 
        tools: { 
          download: true, 
          selection: false, 
          zoom: true, 
          zoomin: false, 
          zoomout: false, 
          reset: true 
        },
        offsetX: -5,
        offsetY: -5
      },
      zoom: { enabled: true },
      animations: { enabled: false },
      sparkline: { enabled: false },
      background: 'transparent'
    },
    colors: ['#2563eb'],
    dataLabels: { enabled: false },
    stroke: { 
      curve: 'smooth', 
      width: 2.5, 
      colors: ['#2563eb'] 
    },
    fill: { 
      type: 'gradient', 
      gradient: { 
        shadeIntensity: 1, 
        opacityFrom: 0.4, 
        opacityTo: 0.05, 
        stops: [0, 90, 100] 
      } 
    },
    xaxis: { 
      categories: [], 
      labels: { 
        style: { 
          colors: '#6b7280',
          fontSize: '10px',
          fontWeight: 400
        },
        offsetY: -3
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: (val) => {
          if (val >= 10000000) return 'Rs. ' + (val / 10000000).toFixed(1) + 'Cr';
          if (val >= 100000) return 'Rs. ' + (val / 100000).toFixed(1) + 'L';
          if (val >= 1000) return 'Rs. ' + (val / 1000).toFixed(1) + 'K';
          return 'Rs. ' + val.toLocaleString();
        },
        style: { 
          colors: '#6b7280',
          fontSize: '9px',
          fontWeight: 400
        },
        offsetX: -5
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    tooltip: { 
      y: { 
        formatter: (val) => 'Rs. ' + val.toLocaleString() 
      },
      style: { 
        fontSize: '11px',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      theme: 'light'
    },
    grid: { 
      borderColor: '#f1f1f1', 
      strokeDashArray: 4,
      padding: {
        left: 0,
        right: 0,
        top: 5,
        bottom: 5
      }
    },
    legend: { show: false }
  };

  const initChart = () => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = new ApexCharts(chartRef.current, chartOptions);
      chartInstance.current.render();
    }
  };

  const updateChart = (categories, seriesData) => {
    if (!chartInstance.current) initChart();
    if (chartInstance.current) {
      chartInstance.current.updateOptions({
        series: [{ data: seriesData }],
        xaxis: { categories }
      }, false, true);
    }
  };

  const fetchData = useCallback(async (force = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (force || !salesChartDraftSave) {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (companyName) params.append('companyName', companyName);
      if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

      const url = `${API_BASE_URL}/api/retailer/retailerDashboard/indexv1?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true,
        signal: abortControllerRef.current.signal
      });

      if (response.data.success) {
        const { chartData } = response.data.data;
        updateChart(chartData.categories, chartData.series[0].data);
        setSalesChartDraftSave({ categories: chartData.categories, seriesData: chartData.series[0].data });
        setDataStatus('fresh');
      } else {
        throw new Error(response.data.error || 'Failed to load data');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      
      console.error('Chart data error:', err);
      setError(err.response?.data?.error || err.message);
      setDataStatus('error');
      if (!salesChartDraftSave) updateChart(['No Data'], [0]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyName, fiscalYearJson, salesChartDraftSave, setSalesChartDraftSave, API_BASE_URL]);

  const refreshData = () => {
    fetchData(true);
  };

  useEffect(() => {
    if (!companyId || !currentCompany) return;
    
    initChart();
    
    return () => {
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [companyId, currentCompany]);

  useEffect(() => {
    if (!companyId || !currentCompany) return;

    if (salesChartDraftSave) {
      updateChart(salesChartDraftSave.categories, salesChartDraftSave.seriesData);
      setDataStatus('cached');
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchData(!salesChartDraftSave);
    } else {
      if (salesChartDraftSave) {
        fetchData(true);
      } else {
        fetchData(false);
      }
    }

    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData(true);
      }, 300000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [companyId, currentCompany, fiscalYearJson]);

  if (loading && !salesChartDraftSave) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h6 style={styles.title}>
            <i className="bi bi-graph-up" style={{ color: '#2563eb' }}></i>
            Sales Overview
          </h6>
        </div>
        <div style={styles.loadingState}>
          <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ color: '#2563eb' }}></div>
          <small style={{ color: '#6b7280', marginTop: '8px', fontSize: '12px' }}>Loading chart...</small>
        </div>
      </div>
    );
  }

  if (error && !salesChartDraftSave) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h6 style={styles.title}>
            <i className="bi bi-graph-up" style={{ color: '#2563eb' }}></i>
            Sales Overview
          </h6>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={styles.errorState}>
            <p style={styles.errorText}>
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </p>
            <button 
              className="btn btn-sm btn-outline-danger py-0 px-2"
              onClick={refreshData}
              style={{ fontSize: '12px' }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h6 style={styles.title}>
          <i className="bi bi-graph-up" style={{ color: '#2563eb' }}></i>
          Sales Overview
        </h6>
        <button 
          style={styles.refreshButton}
          onClick={refreshData}
          disabled={loading}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = styles.refreshButtonHover.backgroundColor;
              e.target.style.borderColor = styles.refreshButtonHover.borderColor;
              e.target.style.color = styles.refreshButtonHover.color;
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.color = '#4a5568';
          }}
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>
      <div style={styles.body}>
        <div id="revenue-chart" ref={chartRef} style={styles.chartWrapper}></div>
        {dataStatus === 'cached' && (
          <div style={styles.cachedIndicator}>
            <i className="bi bi-clock-history me-1"></i>
            Cached
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;