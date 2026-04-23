import React, { useEffect, useRef, useState } from 'react';
import ApexCharts from 'apexcharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const SalesChart = ({ companyId, companyName, fiscalYearJson }) => {
  const { salesChartDraftSave, setSalesChartDraftSave } = usePageNotRefreshContext();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(!salesChartDraftSave);
  const [error, setError] = useState(null);
  const { currentCompany } = useAuth();
  const [dataStatus, setDataStatus] = useState(salesChartDraftSave ? 'cached' : 'loading');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const chartOptions = {
    series: [{ name: 'Net Sales', data: [] }],
    chart: {
      height: 280,
      type: 'area',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: true, zoomin: false, zoomout: false, reset: true } },
      zoom: { enabled: true },
      animations: { enabled: false }
    },
    colors: ['#0d6efd'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: ['#0d6efd'] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3, stops: [0, 90, 100] } },
    xaxis: { categories: [], labels: { style: { colors: '#6c757d' } } },
    yaxis: {
      labels: {
        formatter: (val) => 'Rs. ' + val.toLocaleString(),
        style: { colors: '#6c757d' }
      }
    },
    tooltip: { y: { formatter: (val) => 'Rs. ' + val.toLocaleString() } },
    grid: { borderColor: '#f1f1f1', strokeDashArray: 3 }
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

  const fetchData = async (force = false) => {
    try {
      if (!salesChartDraftSave || force) setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (companyName) params.append('companyName', companyName);
      if (fiscalYearJson) params.append('fiscalYearJson', fiscalYearJson);

      const response = await axios.get(`/api/retailer/retailerDashboard/indexv1?${params.toString()}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true
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
      console.error('Chart data error:', err);
      setError(err.response?.data?.error || err.message);
      setDataStatus('error');
      if (!salesChartDraftSave) updateChart(['No Data'], [0]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchData(true);
  };

  useEffect(() => {
    if (!companyId || !currentCompany) return;

    // Initialize with empty or cached data
    if (!salesChartDraftSave) {
      initChart();
      updateChart([], []);
    } else {
      initChart();
      updateChart(salesChartDraftSave.categories, salesChartDraftSave.seriesData);
    }

    // Fetch data
    if (!salesChartDraftSave) {
      fetchData();
    } else {
      fetchData().catch(e => console.log('Background fetch:', e));
    }

    // Auto-refresh
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 300000);
    }

    return () => {
      clearInterval(interval);
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [companyId, currentCompany, autoRefresh, fiscalYearJson]);

  if (loading && !salesChartDraftSave) {
    return (
      <div className="card">
        <div className="card-header py-2">
          <h6 className="card-title mb-0"><i className="bi bi-graph-up me-1"></i>Sales</h6>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <small className="d-block mt-2 text-muted">Loading chart...</small>
        </div>
      </div>
    );
  }

  if (error && !salesChartDraftSave) {
    return (
      <div className="card">
        <div className="card-header py-2">
          <h6 className="card-title mb-0"><i className="bi bi-graph-up me-1"></i>Sales</h6>
        </div>
        <div className="card-body p-3">
          <div className="alert alert-danger mb-0 py-2">
            <i className="bi bi-exclamation-triangle me-1"></i>
            <small>{error}</small>
            <button className="btn btn-sm btn-outline-danger py-0 ms-2" onClick={refreshData}>
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header border-0 py-1">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">
            <i className="bi bi-graph-up me-1"></i> Sales Overview
          </h6>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={refreshData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>
      <div className="card-body p-2">
        <div id="revenue-chart" ref={chartRef}></div>
        {dataStatus === 'cached' && (
          <div className="text-end mt-1">
            <small className="text-muted">
              <i className="bi bi-clock-history me-1"></i>
              Cached data - Auto-refreshes every 5 minutes
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;