# bn-tracing
 Tracing with Opentelemetry and Google Trace Exporter

# Usage
Install the npm-package and import it before express is required.

`require(bn-tracing)(options)` 

# Options
```
{
  serviceName: String (Default: default)
  debug: Bool (default: false)
  sampleRatio: Number (default: 0.01)
}
```