#!/usr/bin/env node
import { PrismaClient } from '../src/generated/prisma/index.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const CACHE_DIR = path.join(process.cwd(), 'server', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'sitemap.xml');

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function main() {
  const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  const urls = [];

  urls.push({ loc: `${FRONTEND_URL}/`, changefreq: 'daily', priority: '1.0' });

  const posts = await prisma.post.findMany({ where: { isPrivate: false }, select: { id: true, slug: true, updatedAt: true, createdAt: true } });
  for (const p of posts) {
    const lastmod = (p.updatedAt ?? p.createdAt)?.toISOString?.() || new Date().toISOString();
    urls.push({ loc: `${FRONTEND_URL}/post/${encodeURIComponent(p.id)}`, lastmod, changefreq: 'weekly', priority: '0.8' });
    if (p.slug) urls.push({ loc: `${FRONTEND_URL}/post/${encodeURIComponent(p.slug)}`, lastmod, changefreq: 'weekly', priority: '0.8' });
  }

  const users = await prisma.user.findMany({ where: { isPrivate: false }, select: { username: true, updatedAt: true, createdAt: true } });
  for (const u of users) {
    const lastmod = (u.updatedAt ?? u.createdAt)?.toISOString?.() || new Date().toISOString();
    urls.push({ loc: `${FRONTEND_URL}/profile/${encodeURIComponent(u.username)}`, lastmod, changefreq: 'weekly', priority: '0.6' });
    urls.push({ loc: `${FRONTEND_URL}/profile/@${encodeURIComponent(u.username)}`, lastmod, changefreq: 'weekly', priority: '0.6' });
  }

  const tags = await prisma.hashtag.findMany({ select: { tag: true, createdAt: true } });
  for (const t of tags) {
    const lastmod = (t.createdAt)?.toISOString?.() || new Date().toISOString();
    urls.push({ loc: `${FRONTEND_URL}/hashtags/${encodeURIComponent(t.tag)}`, lastmod, changefreq: 'weekly', priority: '0.5' });
  }

  urls.sort((a, b) => a.loc.localeCompare(b.loc));

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const entry of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    if (entry.changefreq) lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
    if (entry.priority) lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');

  try {
    if (!fsSync.existsSync(CACHE_DIR)) await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, lines.join('\r\n'), 'utf8');
    console.log(`Rebuilt sitemap cache with ${urls.length} entries to ${CACHE_FILE}`);
  } catch (err) {
    console.error('Failed to write sitemap cache file:', err);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Failed to rebuild sitemap:', err);
  process.exit(1);
});
