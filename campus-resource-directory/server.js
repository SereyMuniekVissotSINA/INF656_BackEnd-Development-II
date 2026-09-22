const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const validator = require('validator');
const fillTemplate = require('./modules/fillTemplate');

const resources = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'resources.json'), 'utf8')
);
const overviewTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', 'index.html'), 'utf8'
);
const cardTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', 'card.html'), 'utf8'
);
const resourceTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', 'resource.html'), 'utf8'
);

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost:3000');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }
  const pathname = url.pathname;

  if (pathname === '/') {
    const cards = resources.map(resource => fillTemplate(cardTemplate, resource)).join('\n');
    // Cards are completed HTML, so insert them without escaping the markup.
    const page = overviewTemplate.replace('{{RESOURCE_CARDS}}', () => cards);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  } else if (pathname === '/resource') {
    const id = url.searchParams.get('id');
    const validId = id !== null && validator.isInt(id, {
      min: 1,
      allow_leading_zeroes: false
    });

    const resource = validId
      ? resources.find(item => String(item.id) === id)
      : undefined;

    if (!resource) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - Resource Not Found</h1><p>No resource matches that ID.</p><a href="/">Back to Resources</a>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fillTemplate(resourceTemplate, resource));
  } else if (pathname === '/api/resources') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(resources));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Page Not Found</h1><a href="/">Back to Resources</a>');
  }
});

server.listen(3000, () => {
  console.log('Campus Resource Directory is running at http://localhost:3000');
});
