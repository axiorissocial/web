import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Table, Modal, Nav, Tab, Form, Pagination, Spinner } from 'react-bootstrap';
import Sidebar from '../components/singles/Navbar';
import '../css/admin-panel.scss';
import { useTranslation } from 'react-i18next';

const PAGE_SIZES = [10, 50, 100];
type ReportScope = 'all' | 'post' | 'comment';

type FetchOptions = {
  limit?: number;
  search?: string;
};

type ReportFetchOptions = FetchOptions & {
  scope?: ReportScope;
};

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState<string>('users');

  const [usersPage, setUsersPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [postsTotal, setPostsTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('success');

  const [usersLimit, setUsersLimit] = useState<number>(PAGE_SIZES[0]);
  const [reportsLimit, setReportsLimit] = useState<number>(PAGE_SIZES[0]);
  const [postsLimit, setPostsLimit] = useState<number>(PAGE_SIZES[0]);

  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [usersSearchTerm, setUsersSearchTerm] = useState('');

  const [reportsSearchInput, setReportsSearchInput] = useState('');
  const [reportsSearchTerm, setReportsSearchTerm] = useState('');
  const [reportScope, setReportScope] = useState<ReportScope>('all');

  const [postsSearchInput, setPostsSearchInput] = useState('');
  const [postsSearchTerm, setPostsSearchTerm] = useState('');

  const fetchUsers = async (page = 1, options?: FetchOptions) => {
    if (!user || !(user as any).isAdmin) return;

    const limit = options?.limit ?? usersLimit;
    const search = options?.search ?? usersSearchTerm;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) {
        params.append('search', search);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || t('admin.errors.loadUsers'));
      }

      setUsers(data.users || []);
      setUsersTotal(data.total ?? data.pagination?.total ?? 0);
      setUsersPage(page);

      if (options?.limit !== undefined) {
        setUsersLimit(options.limit);
      }
      if (options?.search !== undefined) {
        setUsersSearchTerm(options.search);
      }
    } catch (err) {
      console.error('Failed to load users', err);
      const fallback = t('admin.errors.loadUsers');
      showAlert(err instanceof Error ? err.message : fallback, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (page = 1, options?: ReportFetchOptions) => {
    if (!user || !(user as any).isAdmin) return;

    const limit = options?.limit ?? reportsLimit;
    const search = options?.search ?? reportsSearchTerm;
    const scope = options?.scope ?? reportScope;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'all',
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) {
        params.append('search', search);
      }

      if (scope !== 'all') {
        params.append('reportType', scope);
      }

      const res = await fetch(`/api/reports?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || t('admin.errors.loadReports'));
      }

      setReports(data.reports || []);
      setReportsTotal(data.pagination?.total ?? data.total ?? 0);
      setReportsPage(page);

      if (options?.limit !== undefined) {
        setReportsLimit(options.limit);
      }
      if (options?.search !== undefined) {
        setReportsSearchTerm(options.search);
      }
      if (options?.scope !== undefined) {
        setReportScope(options.scope);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
      const fallback = t('admin.errors.loadReports');
      showAlert(err instanceof Error ? err.message : fallback, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (page = 1, options?: FetchOptions) => {
    if (!user || !(user as any).isAdmin) return;

    const limit = options?.limit ?? postsLimit;
    const search = options?.search ?? postsSearchTerm;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        includePrivate: 'true'
      });

      if (search) {
        params.append('search', search);
      }

      const res = await fetch(`/api/posts?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || t('admin.errors.loadPosts'));
      }

      setPosts(data.posts || []);
      setPostsTotal(
        data.total ??
        data.pagination?.totalPosts ??
        data.pagination?.total ??
        0
      );
      setPostsPage(page);

      if (options?.limit !== undefined) {
        setPostsLimit(options.limit);
      }
      if (options?.search !== undefined) {
        setPostsSearchTerm(options.search);
      }
    } catch (err) {
      console.error('Failed to load posts', err);
      const fallback = t('admin.errors.loadPosts');
      showAlert(err instanceof Error ? err.message : fallback, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !(user as any).isAdmin) return;
    fetchUsers();
    fetchReports();
    fetchPosts();
  }, [user]);

  useEffect(() => {
    document.title = t('admin.meta.documentTitle', { app: t('app.name') });
  }, [t, i18n.language]);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => setAlertMessage(''), 5000);
  };

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    pageSize: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalItems === 0) return null;

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    if (totalPages <= 1) {
      return (
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <span>{t('admin.pagination.range', { start: startItem, end: endItem, total: totalItems })}</span>
        </div>
      );
    }

    const items = [];
    for (let page = 1; page <= totalPages; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => onPageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <span>{t('admin.pagination.range', { start: startItem, end: endItem, total: totalItems })}</span>
        <Pagination className="mb-0">{items}</Pagination>
      </div>
    );
  };

  if (!user || !(user as any).isAdmin) {
    return <div className="p-4">{t('admin.accessRequired')}</div>;
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

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/user/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setUsers(u => u.filter(x => x.id !== id));
        setUsersTotal(total => Math.max(0, total - 1));
        showAlert(t('admin.users.feedback.deleteSuccess'), 'success');
      } else {
        const error = await res.json();
        throw new Error(error.error || t('admin.errors.deleteUser'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert(error instanceof Error ? error.message : t('admin.errors.deleteUser'), 'danger');
    }
  };

  const banUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/user/${id}/ban`, { method: 'PATCH', credentials: 'include' });
      if (res.ok) {
        setUsers(u => u.map(x => (x.id === id ? { ...x, isPrivate: true } : x)));
        showAlert(t('admin.users.feedback.banSuccess'), 'success');
      } else {
        const error = await res.json();
        throw new Error(error.error || t('admin.errors.banUser'));
      }
    } catch (error) {
      console.error('Error banning user:', error);
      showAlert(error instanceof Error ? error.message : t('admin.errors.banUser'), 'danger');
    }
  };

  const unbanUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/user/${id}/unban`, { method: 'PATCH', credentials: 'include' });
      if (res.ok) {
        setUsers(u => u.map(x => (x.id === id ? { ...x, isPrivate: false } : x)));
        showAlert(t('admin.users.feedback.unbanSuccess'), 'success');
      } else {
        const error = await res.json();
        throw new Error(error.error || t('admin.errors.unbanUser'));
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      showAlert(error instanceof Error ? error.message : t('admin.errors.unbanUser'), 'danger');
    }
  };

  const deletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/post/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setPosts(p => p.filter(x => x.id !== id));
        setPostsTotal(total => Math.max(0, total - 1));
        showAlert(t('admin.posts.feedback.deleteSuccess'), 'success');
      } else {
        const error = await res.json();
        throw new Error(error.error || t('admin.errors.deletePost'));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showAlert(error instanceof Error ? error.message : t('admin.errors.deletePost'), 'danger');
    }
  };

  const updateReportStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setReports(r => r.map(rr => (rr.id === id ? data.report : rr)));
        showAlert(t('admin.reports.feedback.statusUpdated', { status: t(`admin.reports.status.${status.toLowerCase()}`) }), 'success');
      } else {
        const error = await res.json();
        throw new Error(error.error || t('admin.errors.updateReport'));
      }
    } catch (error) {
      console.error('Error updating report:', error);
      showAlert(error instanceof Error ? error.message : t('admin.errors.updateReport'), 'danger');
    }
  };

  const handleUsersSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = usersSearchInput.trim();
    setUsersSearchInput(term);
    fetchUsers(1, { search: term });
  };

  const handleUsersSearchClear = () => {
    setUsersSearchInput('');
    fetchUsers(1, { search: '' });
  };

  const handleUsersLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(event.target.value);
    fetchUsers(1, { limit: newLimit });
  };

  const handleReportsSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = reportsSearchInput.trim();
    setReportsSearchInput(term);
    fetchReports(1, { search: term });
  };

  const handleReportsSearchClear = () => {
    setReportsSearchInput('');
    fetchReports(1, { search: '' });
  };

  const handleReportsLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(event.target.value);
    fetchReports(1, { limit: newLimit });
  };

  const handleReportScopeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newScope = event.target.value as ReportScope;
    fetchReports(1, { scope: newScope });
  };

  const handlePostsSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = postsSearchInput.trim();
    setPostsSearchInput(term);
    fetchPosts(1, { search: term });
  };

  const handlePostsSearchClear = () => {
    setPostsSearchInput('');
    fetchPosts(1, { search: '' });
  };

  const handlePostsLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(event.target.value);
    fetchPosts(1, { limit: newLimit });
  };

  return (
    <div className="app-container">
      <Sidebar activeId="admin" />
      <main className="main-content">
        <div className="container-fluid p-4">
          <h1>{t('admin.title')}</h1>
          {alertMessage && (
            <div className={`alert alert-${alertType} alert-dismissible fade show`} role="alert">
              {alertMessage}
              <button type="button" className="btn-close" onClick={() => setAlertMessage('')}></button>
            </div>
          )}

          <div className="admin-content">
  <h2 className="visually-hidden">{t('admin.title')}</h2>

        <Tab.Container activeKey={activeKey} onSelect={(k) => setActiveKey(k || 'users')}>
          <Nav variant="tabs" className="d-none d-md-flex">
            <Nav.Item>
              <Nav.Link eventKey="users">{t('admin.tabs.users')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="reports">{t('admin.tabs.reports')}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="posts">{t('admin.tabs.posts')}</Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content className="mt-3">
            <Tab.Pane eventKey="users">
              <h4>{t('admin.users.heading')}</h4>
                <div className="d-flex flex-column flex-xl-row gap-3 align-items-start align-items-xl-center justify-content-between">
                  <Form className="d-flex flex-wrap gap-2" onSubmit={handleUsersSearchSubmit}>
                    <Form.Control
                      type="text"
                      placeholder={t('admin.users.searchPlaceholder')}
                      value={usersSearchInput}
                      onChange={(e) => setUsersSearchInput(e.target.value)}
                    />
                    <Button type="submit" variant="primary">{t('admin.actions.search')}</Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={handleUsersSearchClear}
                      disabled={!usersSearchTerm && usersSearchInput === ''}
                    >
                      {t('admin.actions.clear')}
                    </Button>
                  </Form>
                  <Form.Select value={usersLimit} onChange={handleUsersLimitChange} style={{ maxWidth: '180px' }}>
                    {PAGE_SIZES.map(size => (
                      <option key={size} value={size}>{t('admin.pagination.perPage', { count: size })}</option>
                    ))}
                  </Form.Select>
                </div>

                {loading && <Spinner animation="border" size="sm" className="me-2 mt-3" role="status" aria-label={t('common.statuses.loading')} />}

                <Table striped bordered hover className="mt-3">
                  <thead>
                    <tr>
                      <th>{t('admin.users.table.username')}</th>
                      <th>{t('admin.users.table.email')}</th>
                      <th>{t('admin.users.table.admin')}</th>
                      <th>{t('admin.users.table.banned')}</th>
                      <th>{t('admin.users.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-3 text-muted">{t('admin.users.empty')}</td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>{u.email}</td>
                          <td>{u.isAdmin ? t('common.statuses.yes') : t('common.statuses.no')}</td>
                          <td>{u.isPrivate ? t('common.statuses.yes') : t('common.statuses.no')}</td>
                          <td>
                            <Button variant="warning" size="sm" onClick={() => planConfirm(t('admin.users.confirm.ban'), () => banUser(u.id))}>{t('admin.users.actions.ban')}</Button>{' '}
                            <Button variant="secondary" size="sm" onClick={() => planConfirm(t('admin.users.confirm.unban'), () => unbanUser(u.id))}>{t('admin.users.actions.unban')}</Button>{' '}
                            <Button variant="danger" size="sm" onClick={() => planConfirm(t('admin.users.confirm.delete'), () => deleteUser(u.id))}>{t('admin.users.actions.delete')}</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
                {renderPagination(usersPage, usersTotal, usersLimit, (page) => fetchUsers(page))}
            </Tab.Pane>

            <Tab.Pane eventKey="reports">
              <h4>{t('admin.reports.heading')}</h4>
                <div className="d-flex flex-column flex-xl-row gap-3 align-items-start align-items-xl-center justify-content-between">
                  <Form className="d-flex flex-wrap gap-2" onSubmit={handleReportsSearchSubmit}>
                    <Form.Control
                      type="text"
                      placeholder={t('admin.reports.searchPlaceholder')}
                      value={reportsSearchInput}
                      onChange={(e) => setReportsSearchInput(e.target.value)}
                    />
                    <Button type="submit" variant="primary">{t('admin.actions.search')}</Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={handleReportsSearchClear}
                      disabled={!reportsSearchTerm && reportsSearchInput === ''}
                    >
                      {t('admin.actions.clear')}
                    </Button>
                  </Form>
                  <div className="d-flex flex-wrap gap-2">
                    <Form.Select value={reportScope} onChange={handleReportScopeChange} style={{ maxWidth: '200px' }}>
                      <option value="all">{t('admin.reports.filters.all')}</option>
                      <option value="post">{t('admin.reports.filters.post')}</option>
                      <option value="comment">{t('admin.reports.filters.comment')}</option>
                    </Form.Select>
                    <Form.Select value={reportsLimit} onChange={handleReportsLimitChange} style={{ maxWidth: '160px' }}>
                      {PAGE_SIZES.map(size => (
                        <option key={size} value={size}>{t('admin.pagination.perPage', { count: size })}</option>
                      ))}
                    </Form.Select>
                  </div>
                </div>

                {loading && <Spinner animation="border" size="sm" className="me-2 mt-3" role="status" aria-label={t('common.statuses.loading')} />}

                <Table striped bordered hover className="mt-3">
                  <thead>
                    <tr>
                      <th>{t('admin.reports.table.id')}</th>
                      <th>{t('admin.reports.table.type')}</th>
                      <th>{t('admin.reports.table.reason')}</th>
                      <th>{t('admin.reports.table.description')}</th>
                      <th>{t('admin.reports.table.status')}</th>
                      <th>{t('admin.reports.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-3 text-muted">{t('admin.reports.empty')}</td>
                      </tr>
                    ) : (
                      reports.map(r => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.post ? t('admin.reports.types.post') : r.comment ? t('admin.reports.types.comment') : t('admin.reports.types.unknown')}</td>
                          <td>{r.reason}</td>
                          <td>{r.description}</td>
                          <td>{r.status}</td>
                          <td>
                            <Button variant="success" size="sm" onClick={() => planConfirm(t('admin.reports.confirm.resolve'), () => updateReportStatus(r.id, 'RESOLVED'))}>{t('admin.reports.actions.resolve')}</Button>{' '}
                            <Button variant="secondary" size="sm" onClick={() => planConfirm(t('admin.reports.confirm.dismiss'), () => updateReportStatus(r.id, 'DISMISSED'))}>{t('admin.reports.actions.dismiss')}</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
                {renderPagination(reportsPage, reportsTotal, reportsLimit, (page) => fetchReports(page))}
            </Tab.Pane>

            <Tab.Pane eventKey="posts">
              <h4>{t('admin.posts.heading')}</h4>
                <div className="d-flex flex-column flex-xl-row gap-3 align-items-start align-items-xl-center justify-content-between">
                  <Form className="d-flex flex-wrap gap-2" onSubmit={handlePostsSearchSubmit}>
                    <Form.Control
                      type="text"
                      placeholder={t('admin.posts.searchPlaceholder')}
                      value={postsSearchInput}
                      onChange={(e) => setPostsSearchInput(e.target.value)}
                    />
                    <Button type="submit" variant="primary">{t('admin.actions.search')}</Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={handlePostsSearchClear}
                      disabled={!postsSearchTerm && postsSearchInput === ''}
                    >
                      {t('admin.actions.clear')}
                    </Button>
                  </Form>
                  <Form.Select value={postsLimit} onChange={handlePostsLimitChange} style={{ maxWidth: '160px' }}>
                    {PAGE_SIZES.map(size => (
                      <option key={size} value={size}>{t('admin.pagination.perPage', { count: size })}</option>
                    ))}
                  </Form.Select>
                </div>

                <Form className="mb-3 mt-3" onSubmit={(e) => { e.preventDefault(); }}>
                <Form.Group>
                  <Form.Label>{t('admin.posts.quickDelete.label')}</Form.Label>
                  <Form.Control id="delete-post-id" placeholder={t('admin.posts.quickDelete.placeholder')} />
                </Form.Group>
                <Button className="mt-2" variant="danger" onClick={() => {
                  const el = document.getElementById('delete-post-id') as HTMLInputElement | null;
                  if (!el || !el.value) return;
                  planConfirm(t('admin.posts.confirm.delete'), () => deletePost(el.value));
                }}>{t('admin.posts.quickDelete.submit')}</Button>
              </Form>

                {loading && <Spinner animation="border" size="sm" className="me-2 mt-3" role="status" aria-label={t('common.statuses.loading')} />}

                <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>{t('admin.posts.table.id')}</th>
                    <th>{t('admin.posts.table.snippet')}</th>
                    <th>{t('admin.posts.table.user')}</th>
                    <th>{t('admin.posts.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                    {posts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-3 text-muted">{t('admin.posts.empty')}</td>
                      </tr>
                    ) : (
                      posts.map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td>{(p.content || '').substring(0, 80)}</td>
                          <td>{p.user?.username}</td>
                          <td>
                            <Button variant="danger" size="sm" onClick={() => planConfirm(t('admin.posts.confirm.delete'), () => deletePost(p.id))}>{t('admin.posts.actions.delete')}</Button>
                          </td>
                        </tr>
                      ))
                    )}
                </tbody>
              </Table>
                {renderPagination(postsPage, postsTotal, postsLimit, (page) => fetchPosts(page))}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>

        <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('admin.confirmation.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{confirmMessage}</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={runConfirm}>{t('admin.confirmation.confirm')}</Button>
          </Modal.Footer>
        </Modal>
        </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
