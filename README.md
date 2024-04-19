# bn-tracing
 Tracing with Opentelemetry and Google Trace Exporter

# Usage
Install the npm-package and import it before express is required.

`require(bn-tracing)(options)` 

# Options
- `serviceName`: String (default: process.env.K_SERVICE) - The service name shown in UI
- `debug`: Boolean (default: false) - Enables opentelemetry debug-logs
- `instrumentations`: Array (Default: []) - Custom [instrumentations](https://opentelemetry.io/ecosystem/registry/?language=js&component=instrumentation)
- `root`: Object (default: undefined) - Defines root-application where trace should start.
- `batchExport`: Boolean (default: true) - Export the spans to once per minute. If `false` export when span has been created.

# How traces are initiated
A trace can span accross multiple applications. In order to minimize the amount of spans ingested across a number of applications make sure to limit amount of applications using root.

If root is omited the application will not initialize spans missing trace ids.

The root-param accepts an object with `sampleRatio` (0-1) that controls the percentage of requests that should be traced in the root application.


# Usage example
```js
require('bn-tracing')({
  instrumentations: [
    new IORedisInstrumentation(),
  ],
  root: {
    sampleRatio: 0.1
  }
});
```
