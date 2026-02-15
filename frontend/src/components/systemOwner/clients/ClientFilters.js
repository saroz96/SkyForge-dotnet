import React from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { Funnel, X } from 'react-bootstrap-icons';

const ClientFilters = ({ filters, onFilterChange, onToggle }) => {
  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0">
            <Funnel className="me-2" />
            Filters
          </Card.Title>
          <Button 
            variant="light" 
            size="sm" 
            onClick={onToggle}
            className="d-lg-none"
          >
            <X />
          </Button>
        </div>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Search</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search clients..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Sort By</Form.Label>
            <Form.Select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value })}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="revenue">Highest Revenue</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Date Range</Form.Label>
            <Form.Control type="date" className="mb-2" />
            <Form.Control type="date" />
          </Form.Group>

          <div className="d-grid gap-2">
            <Button variant="primary">Apply Filters</Button>
            <Button 
              variant="outline-secondary"
              onClick={() => onFilterChange({
                status: 'all',
                search: '',
                sortBy: 'newest'
              })}
            >
              Clear All
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ClientFilters;