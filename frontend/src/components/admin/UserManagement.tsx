import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@nextui-org/react';
import { Search, UserX, UserCheck, Users } from 'lucide-react';
import { adminAPI } from '../../api/axios';
import type { AdminUser } from '../../types/admin';

const UserManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
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
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="dashboard-title animate-fade-up">
        <h4 className="fw-bold">User Management</h4>
        <p>Manage all registered users on the platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 animate-fade-up delay-1">
        <Card className="content-card">
          <CardBody className="flex items-center gap-3 p-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Users size={20} />
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total Users</p>
              <h5 className="mb-0 fw-bold">{users.length}</h5>
            </div>
          </CardBody>
        </Card>
        <Card className="content-card">
          <CardBody className="flex items-center gap-3 p-4">
            <div className="rounded-2xl bg-success/10 p-3 text-success">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Verified</p>
              <h5 className="mb-0 fw-bold">{users.filter((user) => user.isVerified).length}</h5>
            </div>
          </CardBody>
        </Card>
        <Card className="content-card">
          <CardBody className="flex items-center gap-3 p-4">
            <div className="rounded-2xl bg-warning/10 p-3 text-warning-600">
              <UserX size={20} />
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Pending Verification</p>
              <h5 className="mb-0 fw-bold">{users.filter((user) => !user.isVerified).length}</h5>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="content-card animate-fade-up delay-2">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between p-4 pb-0">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Directory</p>
            <h5 className="mb-0 fw-bold">Registered accounts</h5>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center w-full md:w-auto">
            <Input
              aria-label="Search users"
              placeholder="Search by name or email"
              value={searchTerm}
              onValueChange={setSearchTerm}
              startContent={<Search size={16} className="text-muted-foreground" />}
              className="md:min-w-[280px]"
              variant="bordered"
            />
            <Select
              aria-label="Filter users by role"
              selectedKeys={[filterRole]}
              onSelectionChange={(keys) => setFilterRole(String(Array.from(keys)[0] ?? 'all'))}
              className="md:w-48"
              variant="bordered"
              defaultSelectedKeys={["all"]}
            >
              <SelectItem key="all">All Roles</SelectItem>
              <SelectItem key="admin">Admin</SelectItem>
              <SelectItem key="seller">Seller</SelectItem>
              <SelectItem key="buyer">Buyer</SelectItem>
            </Select>
          </div>
        </CardHeader>

        <CardBody className="p-4 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner color="primary" size="lg" label="Loading users" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table
              aria-label="Registered users"
              removeWrapper
              classNames={{ th: 'bg-default-100 text-foreground font-semibold' }}
            >
              <TableHeader>
                <TableColumn>USER</TableColumn>
                <TableColumn>EMAIL</TableColumn>
                <TableColumn>ROLE</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>JOINED</TableColumn>
                <TableColumn className="text-center">ACTIONS</TableColumn>
              </TableHeader>
              <TableBody items={filteredUsers} emptyContent="No users found">
                {(user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" className="flex-shrink-0" />
                        <div>
                          <p className="mb-0 fw-semibold">{user.name}</p>
                          <p className="mb-0 text-xs text-muted-foreground">{user._id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleChip(user.role)}</TableCell>
                    <TableCell>{getStatusChip(user.isVerified)}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button color="primary" variant="flat" size="sm" onPress={() => handleViewUser(user)}>
                          View details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>
              Showing {filteredUsers.length} of {users.length} users
            </span>
            <div className="flex flex-wrap gap-2">
              <Chip variant="flat" color="primary">Sellers: {stats.sellers}</Chip>
              <Chip variant="flat" color="success">Buyers: {stats.buyers}</Chip>
              <Chip variant="flat" color="danger">Admins: {stats.admins}</Chip>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={showDetailsModal} onOpenChange={setShowDetailsModal} placement="center">
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