# SolidusClient

Render your [Solidus](https://github.com/solidusjs/solidus) views in the browser! Just like Solidus, this library will:

 1. Fetch data from static and dynamic resources, and make it available in the context.
 2. Add and transform the context with custom preprocessors.
 3. Render [Handlebars](http://handlebarsjs.com/) templates, with partials and helpers. The [handlebars-helper](https://github.com/SparkartGroupInc/handlebars-helper) helpers are automatically made available.

Refer to the Solidus documentation to know more about those concepts.

# Usage

Rendering a template starts with the `render` function call, and ends with the `end` callback. The various options can be passed directly to the `render` method as a config object, or by chaining method calls on the returned object.

 - `resources` - Object of named urls or options. The urls can have dynamic segments, which will be replaced by the matching `params`. If an error occurs while fetching a resource, the template is not rendered, except if the resource's `optional` option is `true`.
  ```javascript
  var resources = {
    blogs: 'http://my-site.com/blogs?page={page}',
    news: {
      url: 'http://news-site.com/news',
      proxy: true
    }
  }
  };
  ```

  Available options:
   - `url` - Resource URL.
   - `query` - Object of query values to add to the resource URL.
   - `query_options` - Options passed to [`qs.stringify`](https://github.com/hapijs/qs#stringifying), the function used to serialize the `query` object. An additional option is available, `objectFormat: 'json'`, which will encode query values of type object into JSON strings.
   - `headers` - Object of HTTP headers to add to the resource request.
   - `auth` - Object with `user` and `pass` values for HTTP Basic authentication.
   - `with_credentials` - Whether to send cookies from the origin. Defaults to `false`.
   - `jsonp` - Whether to use jsonp instead of ajax for the request. Defaults to `false`.
   - `proxy` - Whether to fetch the resource through Solidus, instead of directly hitting the resource URL. If `true`, all other options are ignored. Defaults to `false`.
   - `solidus_api_route` - Route to the Solidus `resource.json` endpoint if `proxy` is `true`. Defaults to `/api/`.
   - `timeout` - Maximum time to wait for the resource, in milliseconds. Defaults to 20,000.
   - `optional` - If `true` and the resource cannot be fetched, the template is rendered anyway. Defaults to `false`. Error conditions:
     - Invalid URL.
     - A required `param` is missing.
     - HTTP error, like a network error.
     - Timeout is exceeded.
     - Returned status code is not in the 2xx range.
     - Returned data is not valid JSON.
     - Returned data has a root property named `status` with value `error`.
 - `params` - Object of named values. The values will be interpolated into the dynamic resource urls.
  ```javascript
  var params = {
    page: 123
  };
  ```

 - `required_params` - Array of required param names. If any param is missing, an error is returned.
 - `preprocessor` - Function that modifies the context. The preprocessor is run after the resources are fetched, but before the template is rendered. If an error occurs while running the preprocessor, the template is not rendered.
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
        if (err) throw err;
        context.more_data = data;
        callback(context);
      });
    } else {
      callback(context);
    }
  };
  ```

  Return values:
   - `object` - Modified context.
   - `string` - URL to immediately redirect the browser to, instead of rendering the template.
   - `array` - Item 0 is ignored, item 1 is URL to immediately redirect the browser to, instead of rendering the template.
   - Any other value results in a preprocessor error.

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
  .end(function(err, html) {
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
  .end(function(err, html) {
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
  .end(function(err, html) {
    console.log(html);
  });
```

# Auth

Just like in Solidus, resource security settings are [configured globally](https://github.com/solidusjs/solidus#global-resource-configuration). The `resources_options` property of the `SolidusClient` instance is scanned whenever a resource is fetched, to find matching options. See the Resources documentation above for the available options. Example:

```javascript
var resources_options = {
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

// Two ways to assign the resources options
var solidus_client = new SolidusClient({resources_options: resources_options});
solidus_client.resources_options = resources_options;
```

# Building

```
$ npm run build
```

# Testing

## Node and automated browser tests

```
$ npm run test
```

## Node test

```
$ npm run node-test
```

## Automated browser test

```
$ npm run browser-test
```

## Manual browser test

```
$ npm run test-server
```
Then access [http://localhost:8081/test/browser/test.html](http://localhost:8081/test/browser/test.html) in your browser
