# bn-tracing
 Tracing with Opentelemetry, exported to Google Cloud Trace over OTLP.

Spans are sent to `https://telemetry.googleapis.com` using Application Default
Credentials (`google-auth-library`), so the runtime needs a service account
with the `roles/cloudtrace.agent` role (or equivalent `cloud-platform` scope).

# Usage
Install the npm-package and import it before express is required.

`require(bn-tracing)(options)` 

# Options
```
{
  serviceName: String (Default: default)
  debug: Bool (default: false)
  instrumentations: Array (Default: [])
}
```

# Usage example
```js
require('bn-tracing')({
  serviceName: process.env.K_SERVICE,
  instrumentations: [
    new IORedisInstrumentation(),
  ]
});
```
