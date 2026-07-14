import React, { useEffect, useRef, useState, useCallback } from 'react';
import ApexCharts from 'apexcharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const SalesChart = ({ companyId, companyName, fiscalYearJson }) => {
  const { salesChartDraftSave, setSalesChartDraftSave } = usePageNotRefreshContext();
  
  // Get API base URL from environment variable
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
      sparkline: { enabled: false }
    },
    colors: ['#0d6efd'],
    dataLabels: { enabled: false },
    stroke: { 
      curve: 'smooth', 
      width: 2.5, 
      colors: ['#0d6efd'] 
    },
    fill: { 
      type: 'gradient', 
      gradient: { 
        shadeIntensity: 1, 
        opacityFrom: 0.5, 
        opacityTo: 0.1, 
        stops: [0, 90, 100] 
      } 
    },
    xaxis: { 
      categories: [], 
      labels: { 
        style: { 
          colors: '#6c757d',
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
          colors: '#6c757d',
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
      
      console.log('Fetching chart data from:', url);

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
        console.log('Fetch aborted');
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

  // Initialize chart only once
  useEffect(() => {
    if (!companyId || !currentCompany) return;
    
    initChart();
    
    return () => {
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [companyId, currentCompany]);

  // Handle data fetching
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
        console.log('Auto-refreshing chart data...');
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
      <div className="card border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
        <div className="card-header border-0 bg-transparent py-2 px-3">
          <h6 className="card-title mb-0" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f2f5f8' }}>
            <i className="bi bi-graph-up me-2" style={{ color: '#f1f2f4' }}></i>
            Sales Overview
          </h6>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <small className="d-block mt-2 text-muted" style={{ fontSize: '0.75rem' }}>Loading chart...</small>
        </div>
      </div>
    );
  }

  if (error && !salesChartDraftSave) {
    return (
      <div className="card border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
        <div className="card-header border-0 bg-transparent py-2 px-3">
          <h6 className="card-title mb-0" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f2f5f8' }}>
            <i className="bi bi-graph-up me-2" style={{ color: '#f1f2f4' }}></i>
            Sales Overview
          </h6>
        </div>
        <div className="card-body p-3">
          <div className="alert alert-danger mb-0 py-2 d-flex align-items-center">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <small className="flex-grow-1">{error}</small>
            <button className="btn btn-sm btn-outline-danger py-0 px-2 ms-2" onClick={refreshData}>
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
      <div className="card-header border-0 bg-transparent py-2 px-3 d-flex justify-content-between align-items-center">
        <h6 className="card-title mb-0" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f2f5f8' }}>
          <i className="bi bi-graph-up me-2" style={{ color: '#f1f2f4' }}></i>
          Sales Overview
        </h6>
        <button 
          className="btn btn-sm btn-outline-secondary py-0 px-2"
          onClick={refreshData}
          disabled={loading}
          style={{ 
            fontSize: '0.7rem',
            borderRadius: '6px',
            borderColor: '#dee2e6',
            color: '#f2f5f8'
          }}
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>
      <div className="card-body pt-0 pb-1 px-2">
        <div id="revenue-chart" ref={chartRef}></div>
        {dataStatus === 'cached' && (
          <div className="text-end mt-0">
            <small className="text-muted" style={{ fontSize: '0.6rem' }}>
              <i className="bi bi-clock-history me-1"></i>
              Cached
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;

