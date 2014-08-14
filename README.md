# SolidusClient

A simple front-end version of [Solidus](https://github.com/solidusjs/solidus), used to prepare and render views in the browser. Just like Solidus, static and dynamic resources can be fetched, the context can be preprocessed, and [https://github.com/SparkartGroupInc/handlebars-helper](handlebars-helper) helpers are automatically made available.

API usage example:

```javascript
var template = Handlebars.compile('My ip: {{ip}}, My partial: {{> my_partial}}');
var resources = {
  jsontest: 'http://{service}.jsontest.com'
};
var preprocessor = function(context) {
  context.ip = context.resources.jsontest.ip;
  return context;
};
var helpers = {
  my_helper: function() {return 'My helper did this!'}
};
var partials = {
  my_partial: Handlebars.compile('Here I am! {{my_helper}}')
};

var solidus_client = new SolidusClient();
solidus_client.render(template)
  .params({service: 'ip'})
  .templateOptions({
    partials: partials,
    helpers: helpers
  })
  .get(resources)
  .then(preprocessor)
  .end(function(html) {
    console.log(html);
  });
```

View object usage example:

```javascript
var view = {
  template: Handlebars.compile('My ip: {{ip}}, My partial: {{> my_partial}}'),
  resources: {
    jsontest: 'http://{service}.jsontest.com'
  },
  preprocessor: function(context) {
    context.ip = context.resources.jsontest.ip;
    return context;
  },
  template_options: {
    helpers: {
      my_helper: function() {return 'My helper did this!'}
    },
    partials: {
      my_partial: Handlebars.compile('Here I am! {{my_helper}}')
    }
  }
};

var solidus_client = new SolidusClient();
solidus_client.render(view)
  .params({service: 'ip'})
  .end(function(html) {
    console.log(html);
  });
```

# TODO

 - Find a smaller HTTP library (hyperquest + url + zlib == 500k)
 - Add a CORS option for each resource (or as a auth option?)
 - Figure out how to specify which resources should be fetched through the server, and which ones should be fetched directly from the external API
