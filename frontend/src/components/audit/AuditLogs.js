// // src/components/Audit/AuditLogs.js
// import React, { useState, useEffect } from 'react';
// import { Table, DatePicker, Select, Input, Button, Card, Statistic, Row, Col, Modal } from 'antd';
// import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
// import { auditApi } from '../services/auditApi';
// import dayjs from 'dayjs';
// import Header from '../retailer/Header';

// const { RangePicker } = DatePicker;
// const { Option } = Select;

// const AuditLogs = () => {
//   const [logs, setLogs] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
//   const [filters, setFilters] = useState({
//     action: '',
//     entityType: '',
//     searchTerm: '',
//     dateRange: null,
//   });
//   const [summary, setSummary] = useState([]);

//   const fetchLogs = async (page = 1, pageSize = 20) => {
//     setLoading(true);
//     try {
//       const params = {
//         page,
//         pageSize,
//         ...filters,
//         fromDate: filters.dateRange?.[0]?.toISOString(),
//         toDate: filters.dateRange?.[1]?.toISOString(),
//       };

//       const response = await auditApi.getLogs(params);

//       // Handle different response structures
//       const data = response.data?.data || response.data || {};
//       const items = data.items || [];
//       const totalCount = data.totalCount || data.total || 0;

//       setLogs(items);
//       setPagination({
//         current: data.page || page,
//         pageSize: data.pageSize || pageSize,
//         total: totalCount,
//       });
//     } catch (error) {
//       console.error('Error fetching logs:', error);
//       // Don't show error to user, just set empty state
//       setLogs([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchSummary = async () => {
//     try {
//       const response = await auditApi.getSummary({
//         fromDate: filters.dateRange?.[0]?.toISOString(),
//         toDate: filters.dateRange?.[1]?.toISOString(),
//       });

//       // Handle different response structures
//       const data = response.data?.data || response.data || [];
//       setSummary(Array.isArray(data) ? data : []);
//     } catch (error) {
//       console.error('Error fetching summary:', error);
//       setSummary([]);
//     }
//   };

//   useEffect(() => {
//     fetchLogs();
//     fetchSummary();
//   }, []);

//   const handleTableChange = (pagination) => {
//     fetchLogs(pagination.current, pagination.pageSize);
//   };

//   const handleFilter = () => {
//     fetchLogs(1, pagination.pageSize);
//     fetchSummary();
//   };

//   const handleReset = () => {
//     setFilters({
//       action: '',
//       entityType: '',
//       searchTerm: '',
//       dateRange: null,
//     });
//     fetchLogs(1, pagination.pageSize);
//     fetchSummary();
//   };

//   const showDetails = (record) => {
//     Modal.info({
//       title: 'Audit Log Details',
//       width: 600,
//       content: (
//         <div>
//           <p><strong>Action:</strong> {record.action}</p>
//           <p><strong>Entity:</strong> {record.entityType} - {record.entityName}</p>
//           <p><strong>Bill Number:</strong> {record.billNumber || 'N/A'}</p>
//           <p><strong>Description:</strong> {record.description}</p>
//           <p><strong>User:</strong> {record.user?.name || 'Unknown'} ({record.user?.email || 'N/A'})</p>
//           <p><strong>IP Address:</strong> {record.ipAddress || 'N/A'}</p>
//           <p><strong>Time:</strong> {record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</p>
//           {record.oldValues && (
//             <div>
//               <p><strong>Old Values:</strong></p>
//               <pre>{typeof record.oldValues === 'string' ? record.oldValues : JSON.stringify(record.oldValues, null, 2)}</pre>
//             </div>
//           )}
//           {record.newValues && (
//             <div>
//               <p><strong>New Values:</strong></p>
//               <pre>{typeof record.newValues === 'string' ? record.newValues : JSON.stringify(record.newValues, null, 2)}</pre>
//             </div>
//           )}
//         </div>
//       ),
//     });
//   };

//   // Helper function to safely get action string
//   const getActionString = (action) => {
//     if (!action) return 'Unknown';
//     if (typeof action === 'string') return action;
//     if (typeof action === 'number') {
//       // If action is enum value, convert to string
//       const actionMap = {
//         0: 'Create',
//         1: 'Update',
//         2: 'Delete',
//         3: 'View',
//         4: 'Login',
//         5: 'Logout',
//         6: 'Print',
//         7: 'Export',
//         8: 'Import',
//         9: 'ChangeParty',
//         10: 'Restore',
//         11: 'Cancel',
//         12: 'Approve',
//         13: 'Reject'
//       };
//       return actionMap[action] || `Action(${action})`;
//     }
//     return String(action);
//   };

//   const columns = [
//     {
//       title: 'Date/Time',
//       dataIndex: 'createdAt',
//       key: 'createdAt',
//       render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
//       sorter: (a, b) => {
//         if (!a.createdAt) return 1;
//         if (!b.createdAt) return -1;
//         return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//       },
//     },
//     {
//       title: 'User',
//       dataIndex: ['user', 'name'],
//       key: 'user',
//       render: (name, record) => name || record.userName || 'Unknown',
//     },
//     {
//       title: 'Action',
//       dataIndex: 'action',
//       key: 'action',
//       render: (action) => {
//         const actionStr = getActionString(action);
//         return (
//           <span className={`action-${actionStr.toLowerCase()}`}>
//             {actionStr}
//           </span>
//         );
//       },
//     },
//     {
//       title: 'Entity Type',
//       dataIndex: 'entityType',
//       key: 'entityType',
//       render: (entityType) => {
//         if (!entityType) return 'N/A';
//         if (typeof entityType === 'string') return entityType;
//         if (typeof entityType === 'number') {
//           const entityMap = {
//             0: 'SalesBill',
//             1: 'PurchaseBill',
//             2: 'SalesReturn',
//             3: 'PurchaseReturn',
//             4: 'Account',
//             5: 'Item',
//             6: 'StockEntry',
//             7: 'Transaction',
//             8: 'User',
//             9: 'Company',
//             10: 'FiscalYear',
//             11: 'Settings',
//             12: 'Payment',
//             13: 'Receipt'
//           };
//           return entityMap[entityType] || `Entity(${entityType})`;
//         }
//         return String(entityType);
//       },
//     },
//     {
//       title: 'Bill/Reference',
//       dataIndex: 'billNumber',
//       key: 'billNumber',
//       render: (billNumber) => billNumber || '-',
//     },
//     {
//       title: 'Description',
//       dataIndex: 'description',
//       key: 'description',
//       ellipsis: true,
//     },
//     {
//       title: 'IP Address',
//       dataIndex: 'ipAddress',
//       key: 'ipAddress',
//       render: (ip) => ip || '-',
//     },
//     {
//       title: 'Details',
//       key: 'details',
//       render: (record) => (
//         <Button
//           type="link"
//           size="small"
//           onClick={() => showDetails(record)}
//         >
//           View
//         </Button>
//       ),
//     },
//   ];

//   // Filter out summary items with undefined or null actions
//   const validSummary = Array.isArray(summary) ? summary.filter(item => item && item.action) : [];

//   return (
//     <div className="audit-logs-container">
//       <Header />
//       <h2>Audit Logs</h2>

//       {/* Filters */}
//       <Card style={{ marginBottom: 16 }}>
//         <div className="filters-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
//           <Select
//             placeholder="Action"
//             allowClear
//             style={{ width: 150 }}
//             value={filters.action}
//             onChange={(value) => setFilters({ ...filters, action: value || '' })}
//           >
//             <Option value="Create">Create</Option>
//             <Option value="Update">Update</Option>
//             <Option value="Delete">Delete</Option>
//             <Option value="View">View</Option>
//             <Option value="Print">Print</Option>
//           </Select>

//           <Select
//             placeholder="Entity Type"
//             allowClear
//             style={{ width: 150 }}
//             value={filters.entityType}
//             onChange={(value) => setFilters({ ...filters, entityType: value || '' })}
//           >
//             <Option value="SalesBill">Sales Bill</Option>
//             <Option value="PurchaseBill">Purchase Bill</Option>
//             <Option value="Item">Item</Option>
//             <Option value="Account">Account</Option>
//             <Option value="StockEntry">Stock Entry</Option>
//           </Select>

//           <Input
//             placeholder="Search..."
//             style={{ width: 200 }}
//             value={filters.searchTerm}
//             onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
//             onPressEnter={handleFilter}
//             prefix={<SearchOutlined />}
//           />

//           <RangePicker
//             style={{ width: 250 }}
//             onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
//           />

//           <Button type="primary" onClick={handleFilter}>
//             Apply
//           </Button>
//           <Button onClick={handleReset} icon={<ReloadOutlined />}>
//             Reset
//           </Button>
//         </div>
//       </Card>

//       {/* Table */}
//       <Table
//         columns={columns}
//         dataSource={logs}
//         rowKey="id"
//         loading={loading}
//         pagination={{
//           current: pagination.current,
//           pageSize: pagination.pageSize,
//           total: pagination.total,
//           showSizeChanger: true,
//           showTotal: (total) => `Total ${total} records`,
//         }}
//         onChange={handleTableChange}
//         scroll={{ x: true }}
//       />
//     </div>
//   );
// };

// export default AuditLogs;

//---------------------------------------------------------------------------end

// src/components/Audit/AuditLogs.js
import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Select, Input, Button, Card, Statistic, Row, Col, Modal, message, Popconfirm, Tag, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { auditApi } from '../services/auditApi';
import dayjs from 'dayjs';
import Header from '../retailer/Header';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    searchTerm: '',
    dateRange: null,
  });
  const [summary, setSummary] = useState([]);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [stats, setStats] = useState({
    totalCount: 0,
    olderThan30Days: 0,
    limit: 5000,
    retentionDays: 30
  });

  const fetchStats = async () => {
    try {
      const response = await auditApi.getCount();
      console.log('Stats response:', response);
      
      // Handle different response structures
      const data = response.data?.data || response.data || {};
      
      setStats({
        totalCount: data.totalCount || 0,
        olderThan30Days: data.olderThan30Days || 0,
        limit: data.limit || 5000,
        retentionDays: data.retentionDays || 30
      });
      
      console.log('Stats set:', {
        totalCount: data.totalCount || 0,
        olderThan30Days: data.olderThan30Days || 0,
        limit: data.limit || 5000,
        retentionDays: data.retentionDays || 30
      });
      
      // Show warning if logs exceed 4500 (90% of 5000)
      if (data.totalCount > 4500) {
        message.warning(`⚠️ Audit logs are approaching limit (${data.totalCount}/${data.limit || 5000}). Cleanup recommended.`, 5);
      }
      
      // Show warning if many logs are older than 30 days
      if (data.olderThan30Days > 100) {
        message.info(`📋 ${data.olderThan30Days} logs are older than 30 days. Consider cleanup.`, 4);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        ...filters,
        fromDate: filters.dateRange?.[0]?.toISOString(),
        toDate: filters.dateRange?.[1]?.toISOString(),
      };

      const response = await auditApi.getLogs(params);
      const data = response.data?.data || response.data || {};
      const items = data.items || [];
      const totalCount = data.totalCount || data.total || 0;

      setLogs(items);
      setPagination({
        current: data.page || page,
        pageSize: data.pageSize || pageSize,
        total: totalCount,
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await auditApi.getSummary({
        fromDate: filters.dateRange?.[0]?.toISOString(),
        toDate: filters.dateRange?.[1]?.toISOString(),
      });

      const data = response.data?.data || response.data || [];
      setSummary(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummary([]);
    }
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      const response = await auditApi.cleanup(5000, 30);
      const data = response.data;
      
      if (data.success && data.data) {
        const result = data.data;
        message.success(
          `Cleanup completed: Deleted ${result.totalDeleted} logs ` +
          `(Age: ${result.deletedByAge}, Count: ${result.deletedByCount}). ` +
          `Remaining: ${result.remainingCount} logs.`
        );
        // Refresh data
        await fetchStats();
        await fetchLogs(1, pagination.pageSize);
        await fetchSummary();
      } else {
        message.error(data.message || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      message.error('Failed to cleanup old logs');
    } finally {
      setCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchSummary();
  }, []);

  const handleTableChange = (pagination) => {
    fetchLogs(pagination.current, pagination.pageSize);
  };

  const handleFilter = () => {
    fetchLogs(1, pagination.pageSize);
    fetchSummary();
  };

  const handleReset = () => {
    setFilters({
      action: '',
      entityType: '',
      searchTerm: '',
      dateRange: null,
    });
    fetchLogs(1, pagination.pageSize);
    fetchSummary();
  };

  const showDetails = (record) => {
    Modal.info({
      title: 'Audit Log Details',
      width: 600,
      content: (
        <div>
          <p><strong>Action:</strong> {record.action}</p>
          <p><strong>Entity:</strong> {record.entityType} - {record.entityName}</p>
          <p><strong>Bill Number:</strong> {record.billNumber || 'N/A'}</p>
          <p><strong>Description:</strong> {record.description}</p>
          <p><strong>User:</strong> {record.user?.name || 'Unknown'} ({record.user?.email || 'N/A'})</p>
          <p><strong>IP Address:</strong> {record.ipAddress || 'N/A'}</p>
          <p><strong>Time:</strong> {record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</p>
          {record.oldValues && (
            <div>
              <p><strong>Old Values:</strong></p>
              <pre>{typeof record.oldValues === 'string' ? record.oldValues : JSON.stringify(record.oldValues, null, 2)}</pre>
            </div>
          )}
          {record.newValues && (
            <div>
              <p><strong>New Values:</strong></p>
              <pre>{typeof record.newValues === 'string' ? record.newValues : JSON.stringify(record.newValues, null, 2)}</pre>
            </div>
          )}
        </div>
      ),
    });
  };

  const getActionString = (action) => {
    if (!action) return 'Unknown';
    if (typeof action === 'string') return action;
    if (typeof action === 'number') {
      const actionMap = {
        0: 'Create',
        1: 'Update',
        2: 'Delete',
        3: 'View',
        4: 'Login',
        5: 'Logout',
        6: 'Print',
        7: 'Export',
        8: 'Import',
        9: 'ChangeParty',
        10: 'Restore',
        11: 'Cancel',
        12: 'Approve',
        13: 'Reject'
      };
      return actionMap[action] || `Action(${action})`;
    }
    return String(action);
  };

  const columns = [
    {
      title: 'Date/Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
      sorter: (a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      },
    },
    {
      title: 'User',
      dataIndex: ['user', 'name'],
      key: 'user',
      render: (name, record) => name || record.userName || 'Unknown',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action) => {
        const actionStr = getActionString(action);
        return (
          <span className={`action-${actionStr.toLowerCase()}`}>
            {actionStr}
          </span>
        );
      },
    },
    {
      title: 'Entity Type',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (entityType) => {
        if (!entityType) return 'N/A';
        if (typeof entityType === 'string') return entityType;
        if (typeof entityType === 'number') {
          const entityMap = {
            0: 'SalesBill',
            1: 'PurchaseBill',
            2: 'SalesReturn',
            3: 'PurchaseReturn',
            4: 'Account',
            5: 'Item',
            6: 'StockEntry',
            7: 'Transaction',
            8: 'User',
            9: 'Company',
            10: 'FiscalYear',
            11: 'Settings',
            12: 'Payment',
            13: 'Receipt'
          };
          return entityMap[entityType] || `Entity(${entityType})`;
        }
        return String(entityType);
      },
    },
    {
      title: 'Bill/Reference',
      dataIndex: 'billNumber',
      key: 'billNumber',
      render: (billNumber) => billNumber || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip) => ip || '-',
    },
    {
      title: 'Details',
      key: 'details',
      render: (record) => (
        <Button
          type="link"
          size="small"
          onClick={() => showDetails(record)}
        >
          View
        </Button>
      ),
    },
  ];

  const validSummary = Array.isArray(summary) ? summary.filter(item => item && item.action) : [];

  // Show cleanup button if total > 4500 OR olderThan30Days > 100
  const showCleanupButton = stats.totalCount > 4500 || stats.olderThan30Days > 100;

  return (
    <div className="audit-logs-container">
      <Header />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ margin: 0 }}>Audit Logs</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Tooltip title="Total logs / Limit">
            <Tag color={stats.totalCount > 4500 ? 'orange' : 'green'}>
              <ClockCircleOutlined /> {stats.totalCount} / {stats.limit}
            </Tag>
          </Tooltip>
          <Tooltip title={`Logs older than ${stats.retentionDays} days`}>
            <Tag color={stats.olderThan30Days > 100 ? 'orange' : 'blue'}>
              <ClockCircleOutlined /> {stats.olderThan30Days} logs &gt; {stats.retentionDays}d
            </Tag>
          </Tooltip>
          {showCleanupButton && (
            <Popconfirm
              title="Cleanup Audit Logs"
              description={
                <div>
                  <p>This will:</p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Delete logs older than 30 days</li>
                    <li>Keep only the latest 5000 logs</li>
                  </ul>
                  <p><strong>Current:</strong> {stats.totalCount} logs ({stats.olderThan30Days} older than 30 days)</p>
                  <p><strong>After cleanup:</strong> ~{Math.min(stats.totalCount - stats.olderThan30Days, 5000)} logs</p>
                  <p style={{ color: 'red', marginTop: '8px' }}>This action cannot be undone!</p>
                </div>
              }
              onConfirm={handleCleanup}
              okText="Yes, Cleanup"
              cancelText="Cancel"
              okType="danger"
              icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            >
              <Button 
                type="danger" 
                icon={<DeleteOutlined />} 
                loading={cleaningUp}
              >
                Cleanup Old Logs
              </Button>
            </Popconfirm>
          )}
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              fetchStats();
              fetchLogs(1, pagination.pageSize);
              fetchSummary();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div className="filters-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <Select
            placeholder="Action"
            allowClear
            style={{ width: 150 }}
            value={filters.action}
            onChange={(value) => setFilters({ ...filters, action: value || '' })}
          >
            <Option value="Create">Create</Option>
            <Option value="Update">Update</Option>
            <Option value="Delete">Delete</Option>
            <Option value="View">View</Option>
            <Option value="Print">Print</Option>
          </Select>

          <Select
            placeholder="Entity Type"
            allowClear
            style={{ width: 150 }}
            value={filters.entityType}
            onChange={(value) => setFilters({ ...filters, entityType: value || '' })}
          >
            <Option value="SalesBill">Sales Bill</Option>
            <Option value="PurchaseBill">Purchase Bill</Option>
            <Option value="Item">Item</Option>
            <Option value="Account">Account</Option>
            <Option value="StockEntry">Stock Entry</Option>
          </Select>

          <Input
            placeholder="Search..."
            style={{ width: 200 }}
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            onPressEnter={handleFilter}
            prefix={<SearchOutlined />}
          />

          <RangePicker
            style={{ width: 250 }}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />

          <Button type="primary" onClick={handleFilter}>
            Apply
          </Button>
          <Button onClick={handleReset} icon={<ReloadOutlined />}>
            Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} records`,
        }}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />
    </div>
  );
};

export default AuditLogs;