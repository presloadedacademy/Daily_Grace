import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from '../../context/NavigationContext.jsx';
import { adminService } from '../../services/adminService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';

export default function AdminMotivationFormPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Extract ID from pathname e.g. /admin/motivations/:id/edit
  const match = pathname.match(/\/admin\/motivations\/([^\/]+)\/edit/);
  const id = match ? match[1] : null;
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    verse: '',
    reference: '',
    reflection: '',
    prayer: '',
    status: 'draft',
  });

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing && id) {
      async function loadMotivation() {
        try {
          setLoading(true);
          const data = await adminService.getMotivation(id);
          setFormData({
            title: data.title || '',
            verse: data.verse || '',
            reference: data.reference || '',
            reflection: data.reflection || '',
            prayer: data.prayer || '',
            status: data.status || 'draft',
          });
        } catch (err) {
          setError(err.data?.message || err.message || 'Failed to load motivation details.');
        } finally {
          setLoading(false);
        }
      }
      loadMotivation();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, overrideStatus = null) => {
    if (e) e.preventDefault();
    setError(null);

    const submitStatus = overrideStatus || formData.status;

    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!formData.verse.trim()) {
      setError('Bible verse is required.');
      return;
    }
    if (!formData.reference.trim()) {
      setError('Scripture reference is required.');
      return;
    }
    if (!formData.reflection.trim()) {
      setError('Reflection is required.');
      return;
    }
    if (!formData.prayer.trim()) {
      setError('Prayer is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        verse: formData.verse.trim(),
        reference: formData.reference.trim(),
        reflection: formData.reflection.trim(),
        prayer: formData.prayer.trim(),
        status: submitStatus,
      };

      if (isEditing) {
        await adminService.updateMotivation(id, payload);
      } else {
        await adminService.createMotivation(payload);
      }

      navigate('/admin/motivations');
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to save motivation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. HEADER */}
        <header className="profile-mobile-header">
          <div>
            <span className="profile-header-tag">ADMINISTRATION</span>
            <h1 className="profile-header-title">
              {isEditing ? 'Edit Motivation' : 'Add New Motivation'}
            </h1>
            <p className="home-dashboard-sub" style={{ marginTop: '0.25rem' }}>
              {isEditing
                ? 'Update Scripture reference, reflection, prayer, or publication status.'
                : 'Add authentic Scripture and reflections to the Daily Grace catalog.'}
            </p>
          </div>
        </header>

        {/* 2. ADMIN NAV TABS */}
        <AdminNav />

        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}


        {loading ? (
          <div className="today-mobile-loading">
            <LoadingSpinner text="Loading content..." />
          </div>
        ) : (
          <main className="profile-mobile-content">
            <section className="profile-form-card">
              <form onSubmit={(e) => handleSubmit(e)} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="title">
                    Devotional Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g. Love Never Fails"
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="verse">
                    Bible Verse (Exact Scripture Text)
                  </label>
                  <textarea
                    id="verse"
                    name="verse"
                    rows="3"
                    placeholder="e.g. Love is patient and kind; love does not envy or boast..."
                    value={formData.verse}
                    onChange={handleChange}
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reference">
                    Scripture Reference
                  </label>
                  <input
                    id="reference"
                    name="reference"
                    type="text"
                    placeholder="e.g. 1 Corinthians 13:4-8"
                    value={formData.reference}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reflection">
                    Short Reflection
                  </label>
                  <textarea
                    id="reflection"
                    name="reflection"
                    rows="4"
                    placeholder="Write a peaceful, thoughtful reflection to encourage the reader today..."
                    value={formData.reflection}
                    onChange={handleChange}
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prayer">
                    Short Prayer
                  </label>
                  <textarea
                    id="prayer"
                    name="prayer"
                    rows="3"
                    placeholder="e.g. Lord, fill my heart with patience and kindness today. Amen."
                    value={formData.prayer}
                    onChange={handleChange}
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status">
                    Publication Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="form-input"
                    style={{ maxWidth: '240px' }}
                  >
                    <option value="draft">Draft (Hidden from users)</option>
                    <option value="published">Published (Available for daily delivery)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {isEditing ? (
                    <button
                      type="submit"
                      className="primary-gold-cta"
                      disabled={saving}
                      style={{ flex: '1 1 180px', padding: '0.9rem 1.5rem', fontSize: '0.92rem' }}
                    >
                      {saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="settings-reset-btn"
                        disabled={saving}
                        onClick={(e) => handleSubmit(e, 'draft')}
                        style={{ flex: '1 1 140px', padding: '0.85rem 1.25rem', borderColor: 'var(--border-medium)', color: 'var(--color-text)' }}
                      >
                        {saving ? 'Saving...' : 'Save as Draft'}
                      </button>
                      <button
                        type="button"
                        className="primary-gold-cta"
                        disabled={saving}
                        onClick={(e) => handleSubmit(e, 'published')}
                        style={{ flex: '1 1 160px', padding: '0.85rem 1.5rem', fontSize: '0.92rem' }}
                      >
                        {saving ? 'Publishing...' : 'Publish'}
                      </button>
                    </>
                  )}

                  <Link
                    to="/admin/motivations"
                    style={{ color: 'var(--color-text-muted)', textDecoration: 'none', marginLeft: 'auto', fontSize: '0.88rem' }}
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </section>
          </main>
        )}

        {/* 2. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}
