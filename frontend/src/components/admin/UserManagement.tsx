import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Spinner, Badge } from 'react-bootstrap';
import { Search, UserX, UserCheck, Users, CircleDot } from 'lucide-react';
import { adminAPI } from '../../api/axios';
import type { AdminUser } from '../../types/admin';

const UserManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // New staff creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('operational_manager');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim() || !createRole) {
      setCreateError('All fields are required');
      return;
    }

    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      setCreateError('');
      setCreateSuccess('');

      await adminAPI.createAdminOrManager({
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole
      });

      setCreateSuccess('Staff account created successfully!');
      void fetchUsers();
      
      // Clear form
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('operational_manager');

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Error creating staff account:', err);
      setCreateError(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setCreating(false);
    }
  };

  

  const getRoleChip = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge bg="danger">Admin</Badge>;
      case 'operational_manager':
        return <Badge bg="warning" text="dark">Operational Manager</Badge>;
      case 'seller':
        return <Badge bg="primary">Seller</Badge>;
      case 'buyer':
        return <Badge bg="success">Buyer</Badge>;
      default:
        return <Badge bg="secondary" className="capitalize">{role.replace('_', ' ')}</Badge>;
    }
  };

  const getStatusChip = (isVerified: boolean) => {
    return isVerified ? <Badge bg="success">Verified</Badge> : <Badge bg="warning" text="dark">Unverified</Badge>;
  };

  const stats = useMemo(() => ({
    sellers: users.filter((user) => user.role === 'seller').length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    admins: users.filter((user) => user.role === 'admin').length,
    managers: users.filter((user) => user.role === 'operational_manager').length,
  }), [users]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'verified' ? user.isVerified : !user.isVerified);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('all');
  };

  const statusLabel = (isVerified: boolean) => (isVerified ? 'Verified' : 'Unverified');

  const statusTone = (isVerified: boolean) => (isVerified ? 'success' : 'warning');

  return (
    <div className="user-management-page">
      <div className="user-management-header animate-fade-up">
        <section className="dashboard-hero hero-premium-mesh admin-dashboard-hero section-card--long">
          <div>
            <p className="dashboard-eyebrow">User Management</p>
            <h4>Manage all registered users on the platform</h4>
            <p>Keep track of accounts, verifications, and roles.</p>
          </div>

          <div className="dashboard-chip-stack">
            <span className="dashboard-chip dashboard-chip-soft">{users.length} total users</span>
            <span className="dashboard-chip">{users.filter(u => u.isVerified).length} verified</span>
          </div>
        </section>
      </div>

      <div className="dashboard-metric-grid user-management-stats animate-fade-up delay-1">
        <article className="dashboard-metric-card user-management-stat-card">
          <div className="user-management-stat-icon user-management-stat-icon--blue">
            <Users size={20} />
          </div>
          <div>
            <span>Total Users</span>
            <strong>{users.length}</strong>
          </div>
        </article>
        <article className="dashboard-metric-card user-management-stat-card">
          <div className="user-management-stat-icon user-management-stat-icon--green">
            <UserCheck size={20} />
          </div>
          <div>
            <span>Verified</span>
            <strong>{users.filter((user) => user.isVerified).length}</strong>
          </div>
        </article>
        <article className="dashboard-metric-card user-management-stat-card">
          <div className="user-management-stat-icon user-management-stat-icon--muted">
            <UserX size={20} />
          </div>
          <div>
            <span>Pending Verification</span>
            <strong>{users.filter((user) => !user.isVerified).length}</strong>
          </div>
        </article>
      </div>

      <div className="content-card user-management-panel animate-fade-up delay-2">
        <div className="user-management-panel-header flex flex-col gap-3">
          <div className="flex flex-row justify-between items-center w-full flex-wrap gap-3">
            <div>
              <p className="user-management-kicker">Directory</p>
              <h5>Registered accounts</h5>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="font-semibold shadow-lg text-white border-0"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                borderRadius: '12px',
                padding: '8px 16px',
              }}
            >
              ➕ Create Staff Account
            </Button>
          </div>
          <div className="user-management-toolbar">
            <label className="user-management-search-field" aria-label="Search users">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by name, email, or user ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <select
              aria-label="Filter users by role"
              className="user-management-filter-select"
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="operational_manager">Operational Manager</option>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
            </select>

            <select
              aria-label="Filter users by status"
              className="user-management-filter-select"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>

            <button type="button" className="user-management-clear-button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="user-management-table-wrap">
          {loading ? (
            <div className="user-management-empty-state">
              <Spinner animation="border" variant="primary" role="status">
                <span className="visually-hidden">Loading users...</span>
              </Spinner>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="user-management-empty-state">
              No users found
            </div>
          ) : (
            <table className="user-management-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Date Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user._id}
                    className={`${index % 2 === 1 ? 'is-alt' : ''} clickable-row`}
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDetailsModal(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="user-management-user-cell d-flex align-items-center">
                        <div 
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#1f4f82',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            marginRight: '10px'
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="user-management-name">{user.name}</p>
                          <p className="user-management-id">{user._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="user-management-email">{user.email}</td>
                    <td>
                      <span className={`user-management-role-pill role-${user.role}`}>
                        {user.role === 'operational_manager' ? 'Operational Manager' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="user-management-date">{formatDate(user.createdAt)}</td>
                    <td>
                      <span className={`user-management-status-pill status-${statusTone(user.isVerified)}`}>
                        <CircleDot size={10} />
                        {statusLabel(user.isVerified)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="user-management-footer">
            <span className="user-management-summary-text">
              Showing {filteredUsers.length} of {users.length} users
            </span>
            <div className="user-management-footer-chips flex gap-2">
              <Badge bg="primary">Sellers: {stats.sellers}</Badge>
              <Badge bg="success">Buyers: {stats.buyers}</Badge>
              <Badge bg="danger">Admins: {stats.admins}</Badge>
              <Badge bg="warning" text="dark">Managers: {stats.managers}</Badge>
            </div>
          </div>

        </div>
      </div>

      <Modal
        show={showDetailsModal}
        onHide={() => {
          setShowDetailsModal(false);
          setSelectedUser(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-dark">User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className="space-y-4 text-dark">
              <div className="flex flex-col items-center gap-3 text-center mb-4">
                <div 
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#1f4f82',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    margin: '0 auto 10px'
                  }}
                >
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="mb-1 font-bold">{selectedUser.name}</h5>
                  <p className="mb-2 text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {getRoleChip(selectedUser.role)}
                    {getStatusChip(selectedUser.isVerified)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border bg-default-50 p-3 text-sm">
                <div className="mb-2">
                  <p className="mb-1 text-muted-foreground font-semibold">User ID</p>
                  <p className="mb-0 break-all">{selectedUser._id}</p>
                </div>
                <div className="mb-2">
                  <p className="mb-1 text-muted-foreground font-semibold">Joined</p>
                  <p className="mb-0">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div className="mb-2">
                  <p className="mb-1 text-muted-foreground font-semibold">Account Type</p>
                  <p className="mb-0 capitalize">{selectedUser.role}</p>
                </div>
                <div className="mb-2">
                  <p className="mb-1 text-muted-foreground font-semibold">Verification Status</p>
                  <p className="mb-0">{selectedUser.isVerified ? 'Verified Account' : 'Unverified Account'}</p>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Staff Creation Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setCreateError('');
          setCreateSuccess('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-xl font-bold text-dark">Create Administrative User</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4 text-dark">
          {createError && (
            <div className="p-3 bg-danger-50 text-danger rounded-xl text-sm font-semibold mb-3">
              ⚠️ {createError}
            </div>
          )}
          {createSuccess && (
            <div className="p-3 bg-success-50 text-success rounded-xl text-sm font-semibold mb-3">
              ✓ {createSuccess}
            </div>
          )}

          <div className="space-y-2 mb-3">
            <label className="text-sm font-semibold text-muted-foreground d-block">Full Name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Enter full name"
              className="w-full p-3 rounded-xl border bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2 mb-3">
            <label className="text-sm font-semibold text-muted-foreground d-block">Email Address</label>
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full p-3 rounded-xl border bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2 mb-3">
            <label className="text-sm font-semibold text-muted-foreground d-block">Password</label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full p-3 rounded-xl border bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2 mb-3">
            <label className="text-sm font-semibold text-muted-foreground d-block">Administrative Role</label>
            <select
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value)}
              className="w-full p-3 rounded-xl border bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="operational_manager">Operational Manager (Business Logic Tier)</option>
              <option value="admin">System Administrator (Governance Tier)</option>
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={creating}
            onClick={handleCreateStaff}
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: '#fff', fontWeight: 600, border: 'none' }}
          >
            {creating ? 'Creating...' : 'Create Account'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManagement;