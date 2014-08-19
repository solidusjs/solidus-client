# SolidusClient

Render your [Solidus](https://github.com/solidusjs/solidus) views in the browser! Just like Solidus, this library will:

 1. Fetch data from static and dynamic resources, and make it available in the context.
 2. Add and transform the context with custom preprocessors.
 3. Render [Handlebars](http://handlebarsjs.com/) templates, with partials and helpers. The [handlebars-helper](https://github.com/SparkartGroupInc/handlebars-helper) helpers are automatically made available.

Refer to the Solidus documentation to know more about those concepts.

# Usage

Rendering a template starts with the `render` function call, and ends with the `end` callback. The various options can be passed directly to the `render` method as a config object, or by chaining method calls on the returned object.

 - `resources` - Object of named urls. The urls can have dynamic segments, which will be replaced by the matching `params`.
  ```javascript
  var resources = {
    blogs: 'http://my-site.com/blogs?page={page}'
  };
  ```

 - `params` - Object of named values. The values will be interpolated into the dynamic resource urls.
  ```javascript
  var params = {
    page: 123
  };
  ```

 - `preprocessor` - Function that modifies the context. The preprocessor is run after the resources are fetched, but before the template is rendered.
  ```javascript
  // Sync
  var preprocessor = function(context) {
    context.blogs_count = context.resources.blogs.length;
    return context;
  };
  ```

  ```javascript
  // Async
  var preprocessor = function(context, callback) {
    context.blogs_count = context.resources.blogs.length;
    if (context.resources.blog.some_condition) {
      solidus_client.getResource('http://www.my-site.com/something', null, function(err, data) {
        context.more_data = data;
        callback(context);
      });
    } else {
      callback(context);
    }
  };
  ```

 - `template` - Compiled [Handlebars template](http://handlebarsjs.com/).
  ```javascript
  var template = Handlebars.compile('{{blogs_count}} posts: <ul>{{#each resources.blogs}}<li>{{> blog}}</li>{{/each}}</ul>');
  ```

 - `template_options` - Object of [options to use](http://handlebarsjs.com/execution.html) when rendering the template: `data`, `helpers` and `partials`.
  ```javascript
  var template_options = {
    helpers: {
      uppercase: function(string) {
        return string.toUpperCase();
      }
    },
    partials: {
      blog: Handlebars.compile('{{uppercase name}}');
    }
  };
  ```

## Config Object Example

```javascript
var view = {
  resources: resources,
  params: params,
  preprocessor: preprocessor,
  template: template,
  template_options: template_options
};

var solidus_client = new SolidusClient();
solidus_client.render(view)
  .end(function(html) {
    console.log(html);
  });
```

## Methods Chain Example

```javascript
var solidus_client = new SolidusClient();
solidus_client.render(template)
  .params(params)
  .template_options(template_options)
  .get(resources)
  .then(preprocessor)
  .end(function(html) {
    console.log(html);
  });
```

## Combined Example

```javascript
var view = {
  resources: resources,
  preprocessor: preprocessor,
  template: template,
  template_options: template_options
};

var solidus_client = new SolidusClient();
solidus_client.render(view)
  .params(params)
  .end(function(html) {
    console.log(html);
  });
```

# Auth

Just like in Solidus, resource security settings are [configured globally](https://github.com/solidusjs/solidus#global-resource-configuration). The `auth` property of the `SolidusClient` instance is scanned whenever a resource is fetched, to find matching auth settings. Example and available options:

```javascript
var auth = {
  "http://proxy.storyteller.io/*": {
    headers: {
      "Api-Key": "0000aaaa-aa00-00aa-a00a-aaaa000000"
    }
  },
  "http://services.sparkart.net/*": {
    query: {
      key: "1111bbbb-bb11-11bb-b11b-bbbb111111"
    }
  }
};

// Two ways to assign the auth
var solidus_client = new SolidusClient({auth: auth});
solidus_client.auth = auth;
```

 - `query` - Object of query values to add to the resource URL.
 - `headers` - Object of HTTP headers to add to the resource request.
 - `auth` - Object with `user` and `pass` values for HTTP Basic authentication.
 - `with_credentials` - Whether to send cookies from the origin. Defaults to `false`.

# TODO

 - Figure out how to specify which resources should be fetched through the server, and which ones should be fetched directly from the external API
