import { Fragment, type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────
// Minimal markdown renderer for agent messages.
//
// Builds React elements directly — never HTML strings — so model output
// cannot inject markup into the page no matter what a vendor page or a
// prompt tried to smuggle into it. Supports the subset the agent actually
// emits: headings, bullet and numbered lists, bold, inline code and links.
// ─────────────────────────────────────────────────────────────

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((token, i) => {
    const key = `${keyPrefix}-${i}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={key}>{token.slice(1, -1)}</code>;
    }

    const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = link[2];
      // Only ever emit http(s) and same-origin links.
      const safe = /^(https?:\/\/|\/)/i.test(href);
      return safe ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      ) : (
        <Fragment key={key}>{link[1]}</Fragment>
      );
    }

    return <Fragment key={key}>{token}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');

  let listItems: string[] = [];
  let listOrdered = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const key = `p-${blocks.length}`;
    blocks.push(<p key={key}>{renderInline(paragraph.join(' '), key)}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const key = `l-${blocks.length}`;
    const items = listItems.map((item, i) => (
      <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
    ));
    blocks.push(
      listOrdered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>,
    );
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const key = `h-${blocks.length}`;
      const level = heading[1].length;
      const content = renderInline(heading[2], key);
      blocks.push(
        level === 1 ? (
          <h1 key={key} className="text-base">
            {content}
          </h1>
        ) : level === 2 ? (
          <h2 key={key} className="text-[15px]">
            {content}
          </h2>
        ) : (
          <h3 key={key} className="text-sm">
            {content}
          </h3>
        ),
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (listItems.length && ordered !== listOrdered) flushList();
      listOrdered = ordered;
      listItems.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return <div className="prose-agent text-[15px] text-ink-2">{blocks}</div>;
}
