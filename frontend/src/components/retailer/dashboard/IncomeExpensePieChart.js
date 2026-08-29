import React, { useEffect, useRef, useState, useCallback } from 'react';
import ApexCharts from 'apexcharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import './IncomeExpensePieChart.css';

const IncomeExpensePieChart = ({ companyId, companyName, fiscalYearJson }) => {
  const { pieChartDraftSave, setPieChartDraftSave } = usePageNotRefreshContext();
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142';
  
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(!pieChartDraftSave);
  const [error, setError] = useState(null);
  const { currentCompany } = useAuth();
  const [dataStatus, setDataStatus] = useState(pieChartDraftSave ? 'cached' : 'loading');
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0 });
  const abortControllerRef = useRef(null);
  const isFirstRender = useRef(true);

  const chartOptions = {
    series: [],
    chart: {
      type: 'donut',
      height: 300,
      toolbar: { 
        show: true, 
        tools: { 
          download: true, 
          selection: false, 
          zoom: false, 
          zoomin: false, 
          zoomout: false, 
          reset: false 
        },
        offsetX: -5,
        offsetY: -5
      },
      animations: { enabled: false },
      background: 'transparent'
    },
    labels: [],
    colors: ['#2563eb', '#3b82f6', '#60a5fa', '#ef4444', '#f87171', '#fca5a5'],
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        return opts.w.globals.series[opts.seriesIndex] > 0 
          ? val.toFixed(1) + '%' 
          : '';
      },
      style: {
        fontSize: '10px',
        fontWeight: 500,
        colors: ['#1f2937']
      },
      dropShadow: {
        enabled: false
      }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 400,
      labels: {
        colors: '#6b7280'
      },
      markers: {
        width: 10,
        height: 10,
        radius: 2
      },
      itemMargin: {
        horizontal: 8,
        vertical: 4
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '12px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#374151',
              offsetY: -10
            },
            value: {
              show: true,
              fontSize: '15px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 600,
              color: '#1f2937',
              offsetY: 10,
              formatter: (val) => 'Rs. ' + Number(val).toLocaleString()
            },
            total: {
              show: true,
              label: 'Gross Total',
              fontSize: '11px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 400,
              color: '#6b7280',
              formatter: (w) => {
                // ⚠️ This shows the SUM of all segments (gross total)
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return 'Rs. ' + total.toLocaleString();
              }
            }
          }
        }
      }
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
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 250
        },
        legend: {
          fontSize: '10px'
        }
      }
    }]
  };

  const initChart = () => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = new ApexCharts(chartRef.current, chartOptions);
      chartInstance.current.render();
    }
  };

  const updateChart = (labels, seriesData, colors = null, netTotal = null) => {
    if (!chartInstance.current) initChart();
    if (chartInstance.current) {
      const options = {
        labels: labels,
        series: seriesData
      };
      
      if (colors && colors.length > 0) {
        options.colors = colors;
      }

      // ✅ Update the total label to show NET total instead of gross
      if (netTotal !== null) {
        options.plotOptions = {
          pie: {
            donut: {
              ...chartOptions.plotOptions.pie.donut,
              labels: {
                ...chartOptions.plotOptions.pie.donut.labels,
                total: {
                  ...chartOptions.plotOptions.pie.donut.labels.total,
                  label: 'Net Total',
                  formatter: () => {
                    return 'Rs. ' + Number(netTotal).toLocaleString();
                  }
                }
              }
            }
          }
        };
      }
      
      chartInstance.current.updateOptions(options, false, true);
    }
  };

  const fetchData = useCallback(async (force = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (force || !pieChartDraftSave) {
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
        const { pieChartData } = response.data.data;
        
        if (pieChartData && pieChartData.segments) {
          const labels = pieChartData.segments.map(s => s.label);
          const series = pieChartData.segments.map(s => Number(s.value));
          const colors = pieChartData.segments.map(s => s.color);
          
          // ✅ Calculate net total (Income - Expenses)
          const totalIncome = Number(pieChartData.totalIncome) || 0;
          const totalExpenses = Number(pieChartData.totalExpenses) || 0;
          const netTotal = totalIncome - totalExpenses;
          
          // ✅ Pass netTotal to updateChart
          updateChart(labels, series, colors, netTotal);
          
          setSummary({
            totalIncome: totalIncome,
            totalExpenses: totalExpenses
          });
          
          setPieChartDraftSave({ 
            labels, 
            series, 
            colors,
            summary: { totalIncome, totalExpenses }
          });
          setDataStatus('fresh');
        } else {
          // No data - show placeholder
          updateChart(['No Data'], [1], ['#e5e7eb'], 0);
          setSummary({ totalIncome: 0, totalExpenses: 0 });
          setPieChartDraftSave({ 
            labels: ['No Data'], 
            series: [1], 
            colors: ['#e5e7eb'],
            summary: { totalIncome: 0, totalExpenses: 0 }
          });
          setDataStatus('fresh');
        }
      } else {
        throw new Error(response.data.error || 'Failed to load data');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      
      console.error('Pie chart data error:', err);
      setError(err.response?.data?.error || err.message);
      setDataStatus('error');
      if (!pieChartDraftSave) {
        updateChart(['No Data'], [1], ['#e5e7eb'], 0);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, companyName, fiscalYearJson, pieChartDraftSave, setPieChartDraftSave, API_BASE_URL]);

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

    if (pieChartDraftSave && pieChartDraftSave.labels) {
      const netTotal = (pieChartDraftSave.summary?.totalIncome || 0) - (pieChartDraftSave.summary?.totalExpenses || 0);
      updateChart(
        pieChartDraftSave.labels, 
        pieChartDraftSave.series, 
        pieChartDraftSave.colors,
        netTotal
      );
      if (pieChartDraftSave.summary) {
        setSummary(pieChartDraftSave.summary);
      }
      setDataStatus('cached');
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchData(!pieChartDraftSave);
    } else {
      fetchData(true);
    }

    let interval;
    if (true) { // autoRefresh
      interval = setInterval(() => {
        fetchData(true);
      }, 300000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [companyId, currentCompany, fiscalYearJson]);

  // Calculate profit/loss
  const profit = summary.totalIncome - summary.totalExpenses;
  const isProfit = profit >= 0;

  // Loading state
  if (loading && !pieChartDraftSave) {
    return (
      <div className="pie-chart-container">
        <div className="pie-chart-header">
          <div className="pie-chart-header-left">
            <div className="pie-chart-icon">
              <i className="bi bi-pie-chart"></i>
            </div>
            <div>
              <h6 className="pie-chart-title">Income vs Expenses</h6>
              <small className="pie-chart-subtitle">Cash flow breakdown</small>
            </div>
          </div>
        </div>
        <div className="pie-chart-loading">
          <div className="pie-spinner"></div>
          <p className="pie-loading-text">Loading chart data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pieChartDraftSave) {
    return (
      <div className="pie-chart-container">
        <div className="pie-chart-header">
          <div className="pie-chart-header-left">
            <div className="pie-chart-icon">
              <i className="bi bi-pie-chart"></i>
            </div>
            <div>
              <h6 className="pie-chart-title">Income vs Expenses</h6>
              <small className="pie-chart-subtitle">Cash flow breakdown</small>
            </div>
          </div>
        </div>
        <div className="pie-chart-error">
          <div className="pie-error-content">
            <i className="bi bi-exclamation-triangle-fill pie-error-icon"></i>
            <p className="pie-error-text">{error}</p>
          </div>
          <button className="pie-btn-refresh pie-btn-refresh--error" onClick={refreshData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="pie-chart-container">
      <div className="pie-chart-header">
        <div className="pie-chart-header-left">
          <div className="pie-chart-icon">
            <i className="bi bi-pie-chart"></i>
          </div>
          <div>
            <h6 className="pie-chart-title">Income vs Expenses</h6>
            <small className="pie-chart-subtitle">Cash flow breakdown</small>
          </div>
        </div>
        <div className="pie-chart-header-right">
          <button 
            className="pie-btn-refresh"
            onClick={refreshData}
            disabled={loading}
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat pie-spin' : 'bi-arrow-clockwise'}`}></i>
            <span>Refresh</span>
          </button>
          {dataStatus === 'cached' && (
            <span className="pie-cached-badge">
              <i className="bi bi-clock-history"></i> Cached
            </span>
          )}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="pie-summary-grid">
        <div className="pie-summary-card pie-summary-income">
          <div className="pie-summary-label">Income</div>
          <div className="pie-summary-value text-success">
            Rs. {summary.totalIncome.toLocaleString()}
          </div>
        </div>
        <div className="pie-summary-card pie-summary-expense">
          <div className="pie-summary-label">Expenses</div>
          <div className="pie-summary-value text-danger">
            Rs. {summary.totalExpenses.toLocaleString()}
          </div>
        </div>
        <div className={`pie-summary-card ${isProfit ? 'pie-summary-profit' : 'pie-summary-loss'}`}>
          <div className="pie-summary-label">Net {isProfit ? 'Profit' : 'Loss'}</div>
          <div className={`pie-summary-value ${isProfit ? 'text-success' : 'text-danger'}`}>
            {isProfit ? '' : '-'} Rs. {Math.abs(profit).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="pie-chart-body">
        <div id="income-expense-pie-chart" ref={chartRef} className="pie-chart-wrapper"></div>
      </div>
    </div>
  );
};

export default IncomeExpensePieChart;