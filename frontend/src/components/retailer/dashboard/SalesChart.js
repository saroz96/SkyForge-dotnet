import React, { useEffect, useRef, useState, useCallback } from 'react';
import ApexCharts from 'apexcharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import './SalesChart.css';

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
      <div className="sc-chart-container">
        <div className="sc-chart-header">
          <div className="sc-chart-header-left">
            <div className="sc-chart-icon">
              <i className="bi bi-graph-up"></i>
            </div>
            <div>
              <h6 className="sc-chart-title">Sales Overview</h6>
              <small className="sc-chart-subtitle">Today's revenue trend</small>
            </div>
          </div>
        </div>
        <div className="sc-chart-loading">
          <div className="sc-spinner"></div>
          <p className="sc-loading-text">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (error && !salesChartDraftSave) {
    return (
      <div className="sc-chart-container">
        <div className="sc-chart-header">
          <div className="sc-chart-header-left">
            <div className="sc-chart-icon">
              <i className="bi bi-graph-up"></i>
            </div>
            <div>
              <h6 className="sc-chart-title">Sales Overview</h6>
              <small className="sc-chart-subtitle">Today's revenue trend</small>
            </div>
          </div>
        </div>
        <div className="sc-chart-error">
          <div className="sc-error-content">
            <i className="bi bi-exclamation-triangle-fill sc-error-icon"></i>
            <p className="sc-error-text">{error}</p>
          </div>
          <button className="sc-btn-refresh sc-btn-refresh--error" onClick={refreshData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-chart-container">
      <div className="sc-chart-header">
        <div className="sc-chart-header-left">
          <div className="sc-chart-icon sc-chart-icon--sales">
            <i className="bi bi-graph-up"></i>
          </div>
          <div>
            <h6 className="sc-chart-title">Sales Overview</h6>
            <small className="sc-chart-subtitle">Today's revenue trend</small>
          </div>
        </div>
        <div className="sc-chart-header-right">
          <button 
            className="sc-btn-refresh"
            onClick={refreshData}
            disabled={loading}
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat sc-spin' : 'bi-arrow-clockwise'}`}></i>
            <span>Refresh</span>
          </button>
          {dataStatus === 'cached' && (
            <span className="sc-cached-badge">
              <i className="bi bi-clock-history"></i> Cached
            </span>
          )}
        </div>
      </div>
      <div className="sc-chart-body">
        <div id="revenue-chart" ref={chartRef} className="sc-chart-wrapper"></div>
      </div>
    </div>
  );
};

export default SalesChart;