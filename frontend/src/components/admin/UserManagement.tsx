import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner } from '@nextui-org/react';
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

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const getRoleChip = (role: string) => {
    switch (role) {
      case 'admin':
        return <Chip color="danger" variant="flat" size="sm">Admin</Chip>;
      case 'seller':
        return <Chip color="primary" variant="flat" size="sm">Seller</Chip>;
      case 'buyer':
        return <Chip color="success" variant="flat" size="sm">Buyer</Chip>;
      default:
        return <Chip variant="flat" size="sm" className="capitalize">{role}</Chip>;
    }
  };

  const getStatusChip = (isVerified: boolean) => {
    return isVerified ? <Chip color="success" variant="dot" size="sm">Verified</Chip> : <Chip color="warning" variant="dot" size="sm">Unverified</Chip>;
  };

  const stats = useMemo(() => ({
    sellers: users.filter((user) => user.role === 'seller').length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    admins: users.filter((user) => user.role === 'admin').length,
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
        <div>
          <div className="dashboard-title">
            <h4 className="fw-bold">User Management</h4>
            <p>Manage all registered users on the platform</p>
          </div>
        </div>
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
        <div className="user-management-panel-header">
          <div>
            <p className="user-management-kicker">Directory</p>
            <h5>Registered accounts</h5>
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
              <Spinner color="primary" size="lg" label="Loading users" />
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
                  <tr key={user._id} className={index % 2 === 1 ? 'is-alt' : ''}>
                    <td>
                      <div className="user-management-user-cell">
                        <Avatar name={user.name} size="sm" className="user-management-avatar" />
                        <div>
                          <p className="user-management-name">{user.name}</p>
                          <p className="user-management-id">{user._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="user-management-email">{user.email}</td>
                    <td>
                      <span className={`user-management-role-pill role-${user.role}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
            <div className="user-management-footer-chips">
              <Chip variant="flat" color="primary">Sellers: {stats.sellers}</Chip>
              <Chip variant="flat" color="success">Buyers: {stats.buyers}</Chip>
              <Chip variant="flat" color="danger">Admins: {stats.admins}</Chip>
            </div>
          </div>

        </div>
      </div>

      <Modal
        isOpen={showDetailsModal}
        onOpenChange={(open) => {
          setShowDetailsModal(open);
          if (!open) {
            setSelectedUser(null);
          }
        }}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">User Details</ModalHeader>
              <ModalBody>
                {selectedUser && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Avatar name={selectedUser.name} size="lg" className="h-20 w-20 text-xl" />
                      <div>
                        <h5 className="mb-1 fw-bold">{selectedUser.name}</h5>
                        <p className="mb-2 text-muted-foreground">{selectedUser.email}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {getRoleChip(selectedUser.role)}
                          {getStatusChip(selectedUser.isVerified)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl border bg-default-50 p-4 text-sm">
                      <div>
                        <p className="mb-1 text-muted-foreground">User ID</p>
                        <p className="mb-0 break-all">{selectedUser._id}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground">Joined</p>
                        <p className="mb-0">{formatDate(selectedUser.createdAt)}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground">Account Type</p>
                        <p className="mb-0 capitalize">{selectedUser.role}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground">Verification Status</p>
                        <p className="mb-0">{selectedUser.isVerified ? 'Verified Account' : 'Unverified Account'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="flat" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default UserManagement;