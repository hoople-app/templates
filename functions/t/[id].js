'use strict';

/**
 * Cloudflare Pages Function: /t/[id]
 * Injects per-template SEO meta tags into index.html using HTMLRewriter.
 * Reads template data from the in-site index.json.
 */

/** Escape HTML special characters to prevent XSS in meta tag values. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function onRequest(context) {
  const { params, request, env } = context;
  const id = params.id;

  // Validate: only lowercase alphanumeric + hyphens
  if (!/^[a-z0-9-]+$/.test(id)) {
    return new Response('Invalid template ID', { status: 400 });
  }

  // Fetch index.json from the in-site assets
  let indexData;
  try {
    const indexUrl = new URL('/index.json', request.url).toString();
    const indexRes = await env.ASSETS.fetch(indexUrl);
    if (!indexRes.ok) {
      return new Response('Failed to load template index', { status: 500 });
    }
    indexData = await indexRes.json();
  } catch (err) {
    return new Response('Internal error loading index', { status: 500 });
  }

  // Find the template by id
  const templates = (indexData && indexData.templates) ? indexData.templates : [];
  const tpl = templates.find(function (t) { return t.id === id; });
  if (!tpl) {
    return new Response('Template not found', { status: 404 });
  }

  // Fetch the base index.html from in-site assets
  let baseHtmlRes;
  try {
    const htmlUrl = new URL('/index.html', request.url).toString();
    baseHtmlRes = await env.ASSETS.fetch(htmlUrl);
    if (!baseHtmlRes.ok) {
      return new Response('Failed to load page', { status: 500 });
    }
  } catch (err) {
    return new Response('Internal error loading page', { status: 500 });
  }

  const name = esc(tpl.name || '');
  const description = esc(tpl.description || '');
  const pageTitle = name + ' -- Hoople Templates';
  const ogImage = 'https://hoople-templates.pages.dev/templates/' + id + '/preview.png';
  const ogUrl = 'https://hoople-templates.pages.dev/t/' + id;

  // Use HTMLRewriter to inject SEO meta tags into <head>
  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
    "connect-src 'self' wss://hoople-relay.bjorn-slettemark.workers.dev; img-src *; frame-src 'self'";

  const transformed = new HTMLRewriter()
    .on('head', {
      element(el) {
        el.append('<title>' + pageTitle + '</title>', { html: true });
        el.append('<meta name="description" content="' + description + '">', { html: true });
        el.append('<meta property="og:title" content="' + pageTitle + '">', { html: true });
        el.append('<meta property="og:description" content="' + description + '">', { html: true });
        el.append('<meta property="og:image" content="' + ogImage + '">', { html: true });
        el.append('<meta property="og:url" content="' + ogUrl + '">', { html: true });
        el.append('<meta property="og:type" content="website">', { html: true });
        el.append('<meta name="twitter:card" content="summary_large_image">', { html: true });
        el.append('<meta name="hoople:template-id" content="' + esc(id) + '">', { html: true });
      }
    })
    .transform(baseHtmlRes);

  // Build response with the same body but custom headers
  const headers = new Headers(transformed.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Content-Security-Policy', csp);
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(transformed.body, {
    status: 200,
    headers,
  });
}
