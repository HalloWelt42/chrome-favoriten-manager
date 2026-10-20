/** Ausgabe der Favoriten in fremden Formaten (Lesezeichen-HTML, CSV, Markdown, OPML, Text). */
import { favoritesOfGroup, sortedGroups } from '../domain/library';
import type { Library } from '../domain/types';
import { favoriteName } from '../domain/views';

export type ExportFormat = 'html' | 'csv' | 'markdown' | 'opml' | 'text';

export interface ExportFile {
  content: string;
  fileName: string;
  mimeType: string;
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const csvCell = (text: string): string => `"${text.replace(/"/g, '""')}"`;

function exportHtml(lib: Library): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>FavGrid</TITLE>',
    '<H1>FavGrid</H1>',
    '<DL><p>'
  ];
  for (const group of sortedGroups(lib)) {
    lines.push(`    <DT><H3>${escapeXml(group.name)}</H3>`, '    <DL><p>');
    for (const fav of favoritesOfGroup(lib, group.id)) {
      lines.push(`        <DT><A HREF="${escapeXml(fav.url)}" ADD_DATE="${Math.floor(fav.createdAt / 1000)}">${escapeXml(favoriteName(fav))}</A>`);
      if (fav.description) lines.push(`        <DD>${escapeXml(fav.description)}`);
    }
    lines.push('    </DL><p>');
  }
  lines.push('</DL><p>');
  return lines.join('\n');
}

function exportCsv(lib: Library): string {
  const groups = new Map(lib.groups.map((g) => [g.id, g.name]));
  const rows = [['URL', 'Name', 'Description', 'Group', 'Tags', 'Created'].map(csvCell).join(',')];
  for (const group of sortedGroups(lib)) {
    for (const f of favoritesOfGroup(lib, group.id)) {
      rows.push(
        [f.url, f.alias, f.description, groups.get(f.groupId) ?? '', f.tags.join(', '), new Date(f.createdAt).toISOString()]
          .map(csvCell)
          .join(',')
      );
    }
  }
  return rows.join('\n');
}

function exportMarkdown(lib: Library): string {
  const out = ['# FavGrid', ''];
  for (const group of sortedGroups(lib)) {
    out.push(`## ${group.icon} ${group.name}`, '');
    for (const f of favoritesOfGroup(lib, group.id)) {
      const name = favoriteName(f).replace(/[[\]]/g, '\\$&');
      out.push(`- [${name}](${f.url})${f.description ? ` - ${f.description}` : ''}`);
    }
    out.push('');
  }
  return out.join('\n');
}

function exportOpml(lib: Library): string {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<opml version="2.0">', '  <head>', '    <title>FavGrid</title>', `    <dateCreated>${new Date().toUTCString()}</dateCreated>`, '  </head>', '  <body>'];
  for (const group of sortedGroups(lib)) {
    out.push(`    <outline text="${escapeXml(group.name)}">`);
    for (const f of favoritesOfGroup(lib, group.id)) {
      out.push(`      <outline type="link" text="${escapeXml(favoriteName(f))}" url="${escapeXml(f.url)}"/>`);
    }
    out.push('    </outline>');
  }
  out.push('  </body>', '</opml>');
  return out.join('\n');
}

function exportText(lib: Library): string {
  return sortedGroups(lib)
    .flatMap((g) => favoritesOfGroup(lib, g.id).map((f) => f.url))
    .join('\n');
}

const EXPORTERS: Record<ExportFormat, { run: (lib: Library) => string; ext: string; mime: string }> = {
  html: { run: exportHtml, ext: 'html', mime: 'text/html' },
  csv: { run: exportCsv, ext: 'csv', mime: 'text/csv' },
  markdown: { run: exportMarkdown, ext: 'md', mime: 'text/markdown' },
  opml: { run: exportOpml, ext: 'opml', mime: 'text/x-opml' },
  text: { run: exportText, ext: 'txt', mime: 'text/plain' }
};

export const EXPORT_FORMATS = Object.keys(EXPORTERS) as ExportFormat[];

export function exportLibrary(lib: Library, format: ExportFormat, date = new Date()): ExportFile {
  const exporter = EXPORTERS[format];
  const day = date.toISOString().slice(0, 10);
  return { content: exporter.run(lib), fileName: `favgrid-${day}.${exporter.ext}`, mimeType: exporter.mime };
}
