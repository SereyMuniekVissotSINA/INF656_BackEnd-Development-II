# Campus Resource Directory

A small Node.js backend built from the assignment's supplied HTML templates.
It uses the built-in HTTP server, a local JSON file, a reusable template module,
and one npm dependency: `validator`.

## Run the project

Install Node.js 22 or newer. Extract the ZIP and open the
`campus-resource-directory` folder in VS Code. In its terminal, run:

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser. The terminal displays:

```text
Campus Resource Directory is running at http://localhost:3000
```

To restart automatically when source files change, stop the server with Ctrl+C
and run:

```bash
npm run dev
```

Run only one server at a time because both commands use port 3000.
For a clean install using the exact dependency lockfile, use `npm ci`.

## Files

| File | Purpose |
| --- | --- |
| `server.js` | Reads files, starts the HTTP server, and handles routes and responses. |
| `data/resources.json` | Contains five resources with unique IDs and all required fields. |
| `modules/fillTemplate.js` | Exports a function that fills a template with one resource's data. |
| `templates/index.html` | Starter overview page, containing `{{RESOURCE_CARDS}}`. |
| `templates/card.html` | Starter card template, including the detail link. |
| `templates/resource.html` | Starter detail page for one resource. |
| `package.json` | npm setup, dependency, and start/dev scripts. |
| `package-lock.json` | Locks the installed dependency version. |
| `.gitignore` | Excludes installed packages and local environment files from Git. |

The assignment permits different filenames; `index.html` is the overview
template, following the provided starter code.

## How it works

1. At startup, `fs.readFileSync()` reads the templates and JSON file.
   `JSON.parse()` converts JSON text into an array of resource objects.
2. `http.createServer()` handles incoming requests. `URL` separates the route
   from query parameters such as `id=1`.
3. For `/`, `map()` calls `fillTemplate()` for each resource, and `join()`
   combines the cards. The server inserts the cards into the overview page.
4. For `/resource?id=1`, the server validates the ID and uses `find()` to select
   the matching object. The template function fills the detail page.
5. For `/api/resources`, `JSON.stringify()` produces the JSON response with
   `Content-Type: application/json; charset=utf-8`.
6. Missing or invalid resource IDs and unknown routes return HTTP 404 responses.

`fillTemplate(template, resource)` replaces all supported placeholders in a
single pass and returns completed HTML. Its `module.exports` is imported with
`require()` in `server.js`.

## npm package

The project was initialized with `npm init -y`, and `validator` was installed
with `npm install validator`.

- `validator.isInt()` checks that requested resource IDs are positive integers.
- `validator.escape()` escapes resource values before inserting them into HTML,
  so text containing characters such as `<`, `>`, and `&` displays safely.

Completed resource cards are inserted as HTML rather than escaped text.

## Data

This is a classroom demo. Resource names describe common campus services;
locations and contact addresses are fictional and are not an official FHSU
directory. Replace them with verified campus information if desired.
Each resource includes `id`, `name`, `location`, `description`, `category`, and
`contact`. Contact information satisfies the assignment's website-or-contact
requirement. Restart the server after editing the JSON data.

## Verification

These checks passed during development using Node.js 24:

| Check | Expected and observed result |
| --- | --- |
| `npm start` | Server starts on port 3000 and prints the startup message. |
| `/` | HTTP 200; all five resources and their links appear in the HTML. |
| `/resource?id=1` through `/resource?id=5` | HTTP 200; each page contains the corresponding resource's data. |
| `/api/resources` | HTTP 200; correct JSON Content-Type and all five objects. |
| `/resource?id=99` | HTTP 404; Resource Not Found. |
| Missing, empty, nonnumeric, zero, negative, and decimal IDs | HTTP 404; server stays running. |
| `/unknown` | HTTP 404; Page Not Found. |
| Template module and validator | Repeated placeholders replaced; HTML characters escaped. |
| `npm run dev` | Watch-mode server starts and serves the overview. |

You can repeat the route checks in your browser after starting the server.
Use the browser's Network tab to inspect response status and Content-Type.
