import React from 'react';

interface LinkItem {
  label: string;
  href: string;
  id?: string;
}

const FooterSingle: React.FC<{ title: string; links: LinkItem[] }> = ({ title, links }) => {
  return (
    <div className="footer-category">
      <div className="footer-category-title">{title}</div>
      <ul className="footer-links list-unstyled">
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.href} {...(l.id ? { id: l.id } : {})}>{l.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FooterSingle;
