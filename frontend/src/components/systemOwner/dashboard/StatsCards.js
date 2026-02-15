import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { People, CurrencyDollar, GraphUpArrow, CheckCircle } from 'react-bootstrap-icons';

const StatsCards = () => {
  const stats = [
    {
      title: 'Total Clients',
      value: '1,248',
      change: '+12.5%',
      icon: <People size={24} />,
      color: 'primary',
      bgColor: 'bg-primary-light'
    },
    {
      title: 'Revenue',
      value: '$89,420',
      change: '+8.2%',
      icon: <CurrencyDollar size={24} />,
      color: 'success',
      bgColor: 'bg-success-light'
    },
    {
      title: 'Active Projects',
      value: '48',
      change: '+5',
      icon: <GraphUpArrow size={24} />,
      color: 'warning',
      bgColor: 'bg-warning-light'
    },
    {
      title: 'Satisfaction Rate',
      value: '94.2%',
      change: '+2.1%',
      icon: <CheckCircle size={24} />,
      color: 'info',
      bgColor: 'bg-info-light'
    }
  ];

  return (
    <Row>
      {stats.map((stat, index) => (
        <Col lg={3} md={6} key={index} className="mb-4">
          <Card className="stat-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">{stat.title}</h6>
                  <h3 className="mb-0">{stat.value}</h3>
                  <small className={`text-${stat.color}`}>
                    {stat.change} from last month
                  </small>
                </div>
                <div className={`icon-container ${stat.bgColor}`}>
                  <span className={`text-${stat.color}`}>
                    {stat.icon}
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StatsCards;