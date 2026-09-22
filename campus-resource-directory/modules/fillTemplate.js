const validator = require('validator');

// Replace every matching placeholder, including repeated names in a page.
function fillTemplate(template, resource) {
  const values = {
    ID: resource.id,
    NAME: resource.name,
    LOCATION: resource.location,
    DESCRIPTION: resource.description,
    CATEGORY: resource.category,
    CONTACT: resource.contact
  };

  return template.replace(/\{\{(ID|NAME|LOCATION|DESCRIPTION|CATEGORY|CONTACT)\}\}/g,
    (placeholder, key) => validator.escape(String(values[key] ?? ''))
  );
}

module.exports = fillTemplate;
