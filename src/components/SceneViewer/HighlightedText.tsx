import { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  protagonistName: string;
  highlightYou?: boolean;
}

interface TextPart {
  text: string;
  highlight: boolean;
}

function buildHighlightParts(
  text: string,
  protagonistName: string,
  highlightYou: boolean,
): TextPart[] {
  const needles: string[] = [];
  if (protagonistName) needles.push(protagonistName);
  if (highlightYou) needles.push('你');

  if (needles.length === 0) {
    return [{ text, highlight: false }];
  }

  needles.sort((a, b) => b.length - a.length);

  const pattern = needles.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'g');
  const parts = text.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: needles.includes(part),
    }));
}

export function HighlightedText({
  text,
  protagonistName,
  highlightYou = true,
}: HighlightedTextProps) {
  const parts = useMemo(
    () => buildHighlightParts(text, protagonistName, highlightYou),
    [text, protagonistName, highlightYou],
  );

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={`${i}-${part.text}`} className="scene-viewer__highlight">
            {part.text}
          </mark>
        ) : (
          <span key={`${i}-${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
