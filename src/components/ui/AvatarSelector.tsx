import React from 'react';
import { Button, Form } from 'react-bootstrap';
import InlineSpinner from './InlineSpinner';
import { getProfileGradientCss, getProfileGradientTextColor } from '../../utils/profileGradients';
import { Upload } from 'react-bootstrap-icons';
import { useTranslation } from 'react-i18next';

interface Gradient {
  id: string;
  label: string;
}

interface Props {
  avatarPreview?: string;
  selectedGradient?: string | null;
  usernameInitial?: string;
  gradients: Gradient[];
  gradientLoading?: { avatar?: boolean; banner?: boolean };
  avatarLoading?: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onRemove?: () => void;
  onSelectGradient: (id: string | null) => void;
}

const AvatarSelector: React.FC<Props> = ({ avatarPreview, selectedGradient, usernameInitial, gradients, gradientLoading, avatarLoading, onFileChange, onUpload, onRemove, onSelectGradient }) => {
  const { t } = useTranslation();
  return (
    <div className="avatar-section mb-4">
      <h6 className="mb-3">{t('settings.profile.picture.title')}</h6>
      <div className="d-flex flex-column flex-md-row align-items-start gap-3">
        <div className="current-avatar">
          {avatarPreview ? (
            <img src={avatarPreview} alt={t('settings.profile.picture.alt')} className="avatar-preview" />
          ) : (
            <div
              className={`avatar-placeholder${selectedGradient ? ' gradient' : ''}`}
              style={selectedGradient ? { background: getProfileGradientCss(selectedGradient), color: getProfileGradientTextColor(selectedGradient) } : undefined}
            >
              {usernameInitial}
            </div>
          )}
        </div>
        <div className="flex-grow-1 avatar-controls">
          <Form.Control type="file" accept="image/*" onChange={onFileChange} className="mb-2" />
          <div className="d-flex flex-wrap gap-2">
            {/** Upload button */}
            <Button variant="primary" size="sm" onClick={onUpload} disabled={avatarLoading}>
              {avatarLoading ? (
                <>
                  <InlineSpinner size="sm" className="me-1" />
                  {t('settings.profile.statuses.uploading')}
                </>
              ) : (
                <>
                  <Upload className="me-1" />
                  {t('settings.profile.picture.upload')}
                </>
              )}
            </Button>
            {avatarPreview && (
              <Button variant="outline-danger" size="sm" onClick={onRemove} disabled={avatarLoading}>
                {t('settings.profile.picture.remove')}
              </Button>
            )}
          </div>
          <p className="text-muted mt-2 mb-2">{t('settings.profile.picture.description')}</p>
        </div>
      </div>

      <div className="gradient-selector mt-3">
        <h6 className="mb-2">{t('settings.profile.picture.gradientTitle')}</h6>
        <div className="gradient-grid">
          <button type="button" className={`gradient-option ${!selectedGradient ? 'selected' : ''}`} onClick={() => onSelectGradient(null)} disabled={!!gradientLoading?.avatar} aria-pressed={!selectedGradient}>
            <span className="gradient-swatch gradient-swatch-none">Ø</span>
            <span className="gradient-label">{t('settings.profile.gradients.none')}</span>
          </button>
          {gradients.map(g => (
            <button key={g.id} type="button" className={`gradient-option ${selectedGradient === g.id ? 'selected' : ''}`} onClick={() => onSelectGradient(g.id)} disabled={!!gradientLoading?.avatar} aria-pressed={selectedGradient === g.id}>
              <span className="gradient-swatch" style={{ background: getProfileGradientCss(g.id), color: getProfileGradientTextColor(g.id) }}>{usernameInitial}</span>
              <span className="gradient-label">{g.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;
