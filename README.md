# bn-tracing
 Tracing with Opentelemetry and Google Trace Exporter

# Usage
Install the npm-package and import it before express is required.

`require(bn-tracing)(options)` 

# Options
- `sampleRatio`: Number (default: 0). The ratio in percentage 0-1 to be traced. If sampleRatio is higher than 0 traces are created in the root-application. Else traces are only created if a parent-span exists.
- `instrumentations`: Array (Default: []) - Custom [instrumentations](https://opentelemetry.io/ecosystem/registry/?language=js&component=instrumentation)
- `serviceName`: String (default: process.env.K_SERVICE) - The service name shown in UI
- `batchExport`: Boolean (default: true) - Export the spans to once per minute. If `false` export when span has been created.
- `debug`: Boolean (default: false) - Enables opentelemetry debug-logs

# How traces are initiated
A trace can span accross multiple applications. In order to minimize the amount of spans ingested across a number of applications make sure to limit amount of applications using sampleRatio.

If samplingRatio is omited or set to 0 the application will not initialize spans missing parent trace ids. But it will create child-spans.

# Usage example
```js
require('bn-tracing')({
  instrumentations: [
    new IORedisInstrumentation(),
  ],
  root: {
    
  }
});
```
