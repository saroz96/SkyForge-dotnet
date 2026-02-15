import React, { useState } from 'react';
import { Container, Navbar, Nav, Form, Dropdown, Badge } from 'react-bootstrap';
import {
  List,
  Search,
  Bell,
  PersonCircle,
  Envelope
} from 'react-bootstrap-icons';
import '../../../stylesheet/systemOwner/layout/Header.css';
import { useAuth } from '../../../context/AuthContext';


const Header = ({ onMenuClick }) => {
    const { logout } = useAuth();

  const [notifications] = useState(3);
  const [messages] = useState(2);

  return (
    <Navbar bg="white" expand="lg" fixed="top" className="header">
      <Container fluid>
        <button className="menu-btn" onClick={onMenuClick}>
          <List size={24} />
        </button>

        <Form className="search-form">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <Form.Control
              type="search"
              placeholder="Search clients, projects..."
              className="search-input"
            />
          </div>
        </Form>

        <Nav className="ms-auto align-items-center">
          <Dropdown align="end">
            <Dropdown.Toggle variant="light" className="notification-btn">
              <Bell size={20} />
              {notifications > 0 && (
                <Badge bg="danger" pill className="notification-badge">
                  {notifications}
                </Badge>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>Notifications ({notifications})</Dropdown.Header>
              <Dropdown.Item>New client registered</Dropdown.Item>
              <Dropdown.Item>Payment received</Dropdown.Item>
              <Dropdown.Item>Meeting scheduled</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown align="end" className="ms-3">
            <Dropdown.Toggle variant="light" className="message-btn">
              <Envelope size={20} />
              {messages > 0 && (
                <Badge bg="success" pill className="notification-badge">
                  {messages}
                </Badge>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>Messages ({messages})</Dropdown.Header>
              <Dropdown.Item>Client inquiry</Dropdown.Item>
              <Dropdown.Item>Support ticket update</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown align="end" className="ms-3">
            <Dropdown.Toggle variant="light" className="profile-btn">
              <PersonCircle size={32} />
              <span className="profile-name ms-2 d-none d-md-inline">
                John Admin
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item>My Profile</Dropdown.Item>
              <Dropdown.Item>Account Settings</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={logout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default Header;