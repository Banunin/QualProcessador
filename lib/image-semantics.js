'use strict';

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function escAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getAttr(tag, name) {
  const m = String(tag || '').match(new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return m ? decodeHtml(m[2]).trim() : '';
}

function setAttr(tag, name, value) {
  const re = new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  const rendered = ` ${name}="${escAttr(value)}"`;
  if (re.test(tag)) return tag.replace(re, rendered);
  return tag.replace(/\s*\/?\s*>$/, `${rendered}>`);
}

function ensureAttr(tag, name, value) {
  return getAttr(tag, name) ? tag : setAttr(tag, name, value);
}

function absoluteUrl(src, baseUrl) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!base) return value;
  return base + '/' + value.replace(/^\/+/, '');
}

function fallbackAlt(context, index) {
  const title = String(context?.title || 'conteúdo do QualProcessador').trim();
  const kind = String(context?.kind || 'Imagem').trim();
  return `${kind} ${index} relacionada a ${title}`;
}

function enrichFigure(figureHtml, context, state) {
  const imgMatch = String(figureHtml).match(/<img\b[^>]*>/i);
  if (!imgMatch) return figureHtml;
  state.index += 1;
  let img = imgMatch[0];
  const captionMatch = String(figureHtml).match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  const caption = captionMatch ? stripTags(captionMatch[1]) : '';
  const altCurrent = getAttr(img, 'alt');
  const alt = altCurrent || caption || fallbackAlt(context, state.index);
  img = setAttr(img, 'alt', alt);
  img = ensureAttr(img, 'loading', 'lazy');
  img = ensureAttr(img, 'decoding', 'async');
  img = ensureAttr(img, 'data-qp-semantic-image', 'true');
  let result = String(figureHtml).replace(imgMatch[0], img);
  if (captionMatch && !caption) {
    result = result.replace(captionMatch[0], `<figcaption>${escAttr(alt)}</figcaption>`);
  }
  return result;
}

function enrichArticleHtml(html, context = {}) {
  const state = { index: 0 };
  let output = String(html || '').replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, block => enrichFigure(block, context, state));
  output = output.replace(/<img\b[^>]*>/gi, tag => {
    if (/data-qp-semantic-image\s*=\s*["']true["']/i.test(tag)) return tag;
    state.index += 1;
    let img = tag;
    const alt = getAttr(img, 'alt') || fallbackAlt(context, state.index);
    img = setAttr(img, 'alt', alt);
    img = ensureAttr(img, 'loading', 'lazy');
    img = ensureAttr(img, 'decoding', 'async');
    img = ensureAttr(img, 'data-qp-semantic-image', 'true');
    return img;
  });
  return output;
}

function collectArticleImages(html, context = {}) {
  const images = [];
  const seen = new Set();
  const enriched = enrichArticleHtml(html, context);
  const figures = enriched.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || [];
  figures.forEach((block, idx) => {
    const img = block.match(/<img\b[^>]*>/i)?.[0];
    if (!img) return;
    const src = getAttr(img, 'src');
    if (!src) return;
    const absolute = absoluteUrl(src, context.baseUrl);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    const caption = stripTags(block.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || '');
    images.push({
      image_url: absolute,
      alt: getAttr(img, 'alt') || fallbackAlt(context, idx + 1),
      caption,
      kind: getAttr(block.match(/<figure\b[^>]*>/i)?.[0] || '', 'data-image-kind') || 'article-image'
    });
  });
  const allImgs = enriched.match(/<img\b[^>]*>/gi) || [];
  allImgs.forEach((img, idx) => {
    const src = getAttr(img, 'src');
    if (!src) return;
    const absolute = absoluteUrl(src, context.baseUrl);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    images.push({
      image_url: absolute,
      alt: getAttr(img, 'alt') || fallbackAlt(context, idx + 1),
      caption: '',
      kind: 'article-image'
    });
  });
  return images;
}

function toImageObject(image, pageUrl) {
  return {
    '@type': 'ImageObject',
    contentUrl: image.image_url,
    url: image.image_url,
    description: image.alt || image.caption || 'Imagem publicada no QualProcessador',
    ...(image.caption ? { caption: image.caption } : {}),
    ...(pageUrl ? { representativeOfPage: false, isPartOf: pageUrl } : {})
  };
}

module.exports = {
  absoluteUrl,
  enrichArticleHtml,
  collectArticleImages,
  toImageObject,
  stripTags,
  getAttr
};
