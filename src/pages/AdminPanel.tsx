import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Table, Modal, Nav, Tab, Form, Navbar as RBNavbar, Container, NavDropdown } from 'react-bootstrap';
import Sidebar from '../components/singles/Navbar';
import '../css/admin-panel.scss';
import { PersonCircle } from 'react-bootstrap-icons';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState<string>('users');

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  useEffect(() => {
    if (!user || !(user as any).isAdmin) return;

    fetch('/api/admin/users', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(err => console.error('Failed to load users', err));

    fetch('/api/reports?status=all&page=1&limit=50', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setReports(data.reports || []))
      .catch(err => console.error('Failed to load reports', err));

    // simple posts list for moderation (recent)
    fetch('/api/posts?page=1&limit=50', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(err => console.error('Failed to load posts', err));
  }, [user]);

  if (!user || !(user as any).isAdmin) {
    return <div className="p-4">Admin access required</div>;
  }

  const planConfirm = (message: string, action: () => Promise<void>) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirm(true);
  };

  const runConfirm = async () => {
    if (confirmAction) {
      try {
        await confirmAction();
      } catch (err) {
        console.error(err);
      }
    }
    setShowConfirm(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  // User actions
  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/admin/user/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setUsers(u => u.filter(x => x.id !== id));
  };

  const banUser = async (id: string) => {
    const res = await fetch(`/api/admin/user/${id}/ban`, { method: 'PATCH', credentials: 'include' });
    if (res.ok) setUsers(u => u.map(x => (x.id === id ? { ...x, isPrivate: true } : x)));
  };

  const unbanUser = async (id: string) => {
    const res = await fetch(`/api/admin/user/${id}/unban`, { method: 'PATCH', credentials: 'include' });
    if (res.ok) setUsers(u => u.map(x => (x.id === id ? { ...x, isPrivate: false } : x)));
  };

  // Post actions
  const deletePost = async (id: string) => {
    const res = await fetch(`/api/admin/post/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setPosts(p => p.filter(x => x.id !== id));
  };

  // Report actions
  const updateReportStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const data = await res.json();
      setReports(r => r.map(rr => (rr.id === id ? data.report : rr)));
    }
  };

  return (
    <div className="admin-page">
      <Sidebar activeId="admin" />

      <div className="admin-content">
        <div className="admin-topbar">
          <RBNavbar bg="transparent" expand={false} className="p-0 mb-3">
            <Container fluid className="p-0">
              <RBNavbar.Brand>Admin Panel</RBNavbar.Brand>
              <div className="d-flex align-items-center">
                <Nav>
                  <Nav.Link onClick={() => setActiveKey('users')}>Users</Nav.Link>
                  <Nav.Link onClick={() => setActiveKey('reports')}>Reports</Nav.Link>
                  <Nav.Link onClick={() => setActiveKey('posts')}>Posts</Nav.Link>
                </Nav>
                <NavDropdown title="Actions" id="admin-actions-dropdown" align="end">
                  <NavDropdown.Item onClick={() => setActiveKey('users')}>Manage Users</NavDropdown.Item>
                  <NavDropdown.Item onClick={() => setActiveKey('reports')}>View Reports</NavDropdown.Item>
                </NavDropdown>
              </div>
            </Container>
          </RBNavbar>
        </div>

        <h2 className="visually-hidden">Admin Panel</h2>

        <Tab.Container activeKey={activeKey} onSelect={(k) => setActiveKey(k || 'users')}>
          <Nav variant="tabs" className="d-none d-md-flex">
            <Nav.Item>
              <Nav.Link eventKey="users">Users</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="reports">Reports</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="posts">Posts</Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content className="mt-3">
            <Tab.Pane eventKey="users">
              <h4>Users</h4>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th>Banned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.isAdmin ? 'Yes' : 'No'}</td>
                      <td>{u.isPrivate ? 'Yes' : 'No'}</td>
                      <td>
                        <Button variant="warning" size="sm" onClick={() => planConfirm('Ban this user?', () => banUser(u.id))}>Ban</Button>{' '}
                        <Button variant="secondary" size="sm" onClick={() => planConfirm('Unban this user?', () => unbanUser(u.id))}>Unban</Button>{' '}
                        <Button variant="danger" size="sm" onClick={() => planConfirm('Delete this user? This cannot be undone.', () => deleteUser(u.id))}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Tab.Pane>

            <Tab.Pane eventKey="reports">
              <h4>Reports</h4>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.post ? 'Post' : r.comment ? 'Comment' : 'Unknown'}</td>
                      <td>{r.reason}</td>
                      <td>{r.description}</td>
                      <td>{r.status}</td>
                      <td>
                        <Button variant="success" size="sm" onClick={() => planConfirm('Mark report resolved?', () => updateReportStatus(r.id, 'RESOLVED'))}>Resolve</Button>{' '}
                        <Button variant="secondary" size="sm" onClick={() => planConfirm('Dismiss this report?', () => updateReportStatus(r.id, 'DISMISSED'))}>Dismiss</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Tab.Pane>

            <Tab.Pane eventKey="posts">
              <h4>Posts</h4>
              <Form className="mb-3" onSubmit={(e) => { e.preventDefault(); }}>
                <Form.Group>
                  <Form.Label>Delete post by ID</Form.Label>
                  <Form.Control id="delete-post-id" placeholder="Enter post ID to delete" />
                </Form.Group>
                <Button className="mt-2" variant="danger" onClick={() => {
                  const el = document.getElementById('delete-post-id') as HTMLInputElement | null;
                  if (!el || !el.value) return;
                  planConfirm('Delete this post?', () => deletePost(el.value));
                }}>Delete Post</Button>
              </Form>

              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Snippet</th>
                    <th>User</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{(p.content || '').substring(0, 80)}</td>
                      <td>{p.user?.username}</td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => planConfirm('Delete post?', () => deletePost(p.id))}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>

        <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm</Modal.Title>
          </Modal.Header>
          <Modal.Body>{confirmMessage}</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={runConfirm}>Confirm</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default AdminPanel;
