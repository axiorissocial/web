import React from 'react';
import '../css/footer.scss';
import { useTranslation } from 'react-i18next';
import FooterSingle from './singles/FooterSingle.tsx';

interface FooterLink {
  labelKey: string; // i18n key
  href: string;
  id?: string;
}

interface FooterCategory {
  titleKey: string; // i18n key
  links: FooterLink[];
}

const defaultCategories: FooterCategory[] = [
//   {
//     titleKey: 'footer.categories.product.title',
//     links: [
//       { labelKey: 'footer.links.features', href: '/features' },
//       { labelKey: 'footer.links.pricing', href: '/pricing' },
//       { labelKey: 'footer.links/docs', href: '/docs' },
//     ]
//   },
//   {
//     titleKey: 'footer.categories.company.title',
//     links: [
//       { labelKey: 'footer.links.about', href: '/about' },
//       { labelKey: 'footer.links.careers', href: '/careers' },
//       { labelKey: 'footer.links.blog', href: '/blog' },
//     ]
//   },
//   {
//     titleKey: 'footer.categories.support.title',
//     links: [
//       { labelKey: 'footer.links.help', href: '/help' },
//       { labelKey: 'footer.links.contact', href: '/contact' },
//       { labelKey: 'footer.links.privacy', href: '/privacy' },
//     ]
//   },
  {
    titleKey: 'footer.categories.legal.title',
    links: [
      { labelKey: 'footer.links.updateCookiePreferences', href: '#', id: 'open_preferences_center' }
    ]
  }
];

const Footer: React.FC<{ categories?: FooterCategory[] }> = ({ categories = defaultCategories }) => {
  const { t } = useTranslation();

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-inner container">
        <div className="footer-grid">
          {categories.map((cat, idx) => (
            <FooterSingle
              key={idx}
              title={t(cat.titleKey)}
              links={cat.links.map(l => ({ label: t(l.labelKey), href: l.href, id: l.id }))}
            />
          ))}
        </div>

        <div className="footer-bottom">
          <div className="footer-copy">© {new Date().getFullYear()} {t('app.name')}</div>
          <div className="footer-actions">
            <a href="/terms">{t('footer.terms')}</a>
            <a href="/cookies">{t('footer.cookies')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
