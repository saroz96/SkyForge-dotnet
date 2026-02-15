import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import StatsCards from '../dashboard/StatsCards';
import Header from '../layout/Header';

const Dashboard = ({ onMenuClick }) => {
  return (
    <>
      <Header onMenuClick={onMenuClick} />
      <Container fluid>
        <br />
        <StatsCards />

        <Row className="mt-4">
          <Col lg={6}>
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Top Performing Clients</h5>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Revenue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>TechCorp Inc.</td>
                        <td>$42,580</td>
                        <td><span className="badge bg-success">Active</span></td>
                      </tr>
                      <tr>
                        <td>Global Solutions</td>
                        <td>$38,920</td>
                        <td><span className="badge bg-success">Active</span></td>
                      </tr>
                      <tr>
                        <td>Innovate Labs</td>
                        <td>$35,150</td>
                        <td><span className="badge bg-warning">Pending</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Col>
          <Col lg={6}>
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Quick Actions</h5>
                <div className="d-grid gap-2">
                  <button className="btn btn-primary">Add New Client</button>
                  <button className="btn btn-outline-primary">Generate Report</button>
                  <button className="btn btn-outline-primary">Send Newsletter</button>
                  <button className="btn btn-outline-primary">Schedule Meeting</button>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Dashboard;