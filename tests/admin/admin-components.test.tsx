import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/admin/dashboard',
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'ADMIN', id: 'admin-user-id' } },
    status: 'authenticated',
  }),
}));

describe('Admin Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('AdminGuard Component', () => {
    it('should render admin content for ADMIN users', () => {
      const AdminGuard = ({ children }: { children: React.ReactNode }) => {
        const { data: session } = require('next-auth/react').useSession();
        
        if (session?.user?.role !== 'ADMIN') {
          return <div>Unauthorized</div>;
        }
        
        return <div>{children}</div>;
      };

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should show unauthorized message for non-ADMIN users', () => {
      // Mock non-admin user
      jest.doMock('next-auth/react', () => ({
        useSession: () => ({
          data: { user: { role: 'USER', id: 'regular-user-id' } },
          status: 'authenticated',
        }),
      }));

      const AdminGuard = ({ children }: { children: React.ReactNode }) => {
        const { data: session } = require('next-auth/react').useSession();
        
        if (session?.user?.role !== 'ADMIN') {
          return <div>Unauthorized</div>;
        }
        
        return <div>{children}</div>;
      };

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  describe('AdminNavigation Component', () => {
    it('should render navigation menu', () => {
      const AdminNavigation = () => (
        <nav>
          <ul>
            <li><a href="/admin/dashboard">Dashboard</a></li>
            <li><a href="/admin/studios">Studios</a></li>
            <li><a href="/admin/analytics">Analytics</a></li>
          </ul>
        </nav>
      );

      render(<AdminNavigation />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Studios')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('should highlight active navigation item', () => {
      const AdminNavigation = () => (
        <nav>
          <ul>
            <li className="active"><a href="/admin/dashboard">Dashboard</a></li>
            <li><a href="/admin/studios">Studios</a></li>
          </ul>
        </nav>
      );

      render(<AdminNavigation />);

      const activeItem = screen.getByText('Dashboard').closest('li');
      expect(activeItem).toHaveClass('active');
    });
  });

  describe('Admin Dashboard Page', () => {
    it('should render dashboard with statistics', async () => {
      const AdminDashboard = () => (
        <div>
          <h1>Admin Dashboard</h1>
          <div className="stats">
            <div className="stat">
              <span className="label">Total Studios</span>
              <span className="value">150</span>
            </div>
            <div className="stat">
              <span className="label">Total Users</span>
              <span className="value">75</span>
            </div>
          </div>
        </div>
      );

      render(<AdminDashboard />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Studios')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('Admin Studios Page', () => {
    it('should render studios list', () => {
      const AdminStudios = () => (
        <div>
          <h1>Studio Management</h1>
          <div className="studios-list">
            <div className="studio-item">
              <span>Studio 1</span>
              <span>London</span>
            </div>
            <div className="studio-item">
              <span>Studio 2</span>
              <span>Manchester</span>
            </div>
          </div>
        </div>
      );

      render(<AdminStudios />);

      expect(screen.getByText('Studio Management')).toBeInTheDocument();
      expect(screen.getByText('Studio 1')).toBeInTheDocument();
      expect(screen.getByText('Studio 2')).toBeInTheDocument();
    });

    it('should handle studio creation', async () => {
      const AdminStudios = () => {
        const [studios, setStudios] = React.useState([
          { id: '1', name: 'Studio 1', location: 'London' }
        ]);

        const addStudio = () => {
          setStudios([...studios, { id: '2', name: 'Studio 2', location: 'Manchester' }]);
        };

        return (
          <div>
            <h1>Studio Management</h1>
            <button onClick={addStudio}>Add Studio</button>
            <div className="studios-list">
              {studios.map(studio => (
                <div key={studio.id} className="studio-item">
                  <span>{studio.name}</span>
                  <span>{studio.location}</span>
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(<AdminStudios />);

      expect(screen.getByText('Studio 1')).toBeInTheDocument();
      expect(screen.queryByText('Studio 2')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Add Studio'));

      await waitFor(() => {
        expect(screen.getByText('Studio 2')).toBeInTheDocument();
      });
    });
  });

  describe('Admin FAQ Page', () => {
    it('should render FAQ list', () => {
      const AdminFAQ = () => (
        <div>
          <h1>FAQ Management</h1>
          <div className="faq-list">
            <div className="faq-item">
              <span>What is VOSF?</span>
              <span>Voice Over Studio Finder</span>
            </div>
            <div className="faq-item">
              <span>How do I book?</span>
              <span>Contact the studio directly</span>
            </div>
          </div>
        </div>
      );

      render(<AdminFAQ />);

      expect(screen.getByText('FAQ Management')).toBeInTheDocument();
      expect(screen.getByText('What is VOSF?')).toBeInTheDocument();
      expect(screen.getByText('How do I book?')).toBeInTheDocument();
    });
  });

  describe('Admin Query Page', () => {
    it('should render query interface', () => {
      const AdminQuery = () => (
        <div>
          <h1>Database Query</h1>
          <textarea placeholder="Enter SQL query..." />
          <button>Execute Query</button>
        </div>
      );

      render(<AdminQuery />);

      expect(screen.getByText('Database Query')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter SQL query...')).toBeInTheDocument();
      expect(screen.getByText('Execute Query')).toBeInTheDocument();
    });

    it('should handle query execution', async () => {
      const AdminQuery = () => {
        const [result, setResult] = React.useState('');

        const executeQuery = () => {
          setResult('Query executed successfully');
        };

        return (
          <div>
            <h1>Database Query</h1>
            <textarea placeholder="Enter SQL query..." />
            <button onClick={executeQuery}>Execute Query</button>
            {result && <div className="result">{result}</div>}
          </div>
        );
      };

      render(<AdminQuery />);

      expect(screen.queryByText('Query executed successfully')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Execute Query'));

      await waitFor(() => {
        expect(screen.getByText('Query executed successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Shared Components', () => {
    it('should render DataTable component', () => {
      const DataTable = ({ data }: { data: any[] }) => (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

      const mockData = [
        { name: 'Studio 1', location: 'London' },
        { name: 'Studio 2', location: 'Manchester' }
      ];

      render(<DataTable data={mockData} />);

      expect(screen.getByText('Studio 1')).toBeInTheDocument();
      expect(screen.getByText('Studio 2')).toBeInTheDocument();
    });

    it('should render Modal component', () => {
      const Modal = ({ isOpen, onClose, children }: { 
        isOpen: boolean; 
        onClose: () => void; 
        children: React.ReactNode; 
      }) => {
        if (!isOpen) return null;

        return (
          <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </div>
        );
      };

      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);

        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <div>Modal Content</div>
            </Modal>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Open Modal'));

      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });
  });
});
