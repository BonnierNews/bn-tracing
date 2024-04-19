import { diag, DiagConsoleLogger, DiagLogLevel, trace } from "@opentelemetry/api";
// Instrumentations intructs different libraries to automatically collect telemetry data
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation, ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
// NodeTracerProvider is the default tracer provider for Node.js
// Necessary to register instrumentations
import { NodeTracerProvider, ParentBasedSampler, TraceIdRatioBasedSampler, AlwaysOffSampler } from "@opentelemetry/sdk-trace-node";
// Use sdk-trace base to send create manual traces and send them to the exporter
import { SimpleSpanProcessor, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { TraceExporter } from "@google-cloud/opentelemetry-cloud-trace-exporter";
import { detectResourcesSync } from "@opentelemetry/resources";
import { gcpDetector } from "@opentelemetry/resource-detector-gcp";

let providerRegistered = false;
/**
 * Initialize the OpenTelemetry SDK and register instrumentations
 * 
 * param {number} sampleRatio - The ratio of traces to sample. 0 to disable sampling
 * param {Array} instrumentations - Array of instrumentations to register
 * param {string} serviceName - The name of the service
 * param {boolean} batchExport - Whether to batch export traces
 * param {boolean} debug - Whether to enable debug logging
 * 
 * return {Tracer} - The tracer instance

 */
export default ({ 
  sampleRatio = 0.01,
  instrumentations = [],
  serviceName = process.env.K_SERVICE, 
  batchExport = true,
  debug = false
} = {}) => {
  if (providerRegistered) {
    return trace.getTracer(serviceName);
  }
  if (debug) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const resource = detectResourcesSync({ detectors: [ gcpDetector ] });

  // Initialize the exporter. When your application is running on Google Cloud,
  // you don't need to provide auth credentials or a project id.
  const exporter = new TraceExporter();

  // Enable OpenTelemetry exporters to export traces to Google Cloud Trace.
  // Exporters use Application Default Credentials (ADCs) to authenticate.
  // See https://developers.google.com/identity/protocols/application-default-credentials
  // for more details.

  const provider = new NodeTracerProvider({
    resource,
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(sampleRatio) }),
  });
  // Configure the span processor to send spans to the exporter
  const spanProcessor = batchExport ? new BatchSpanProcessor(exporter) : new SimpleSpanProcessor(exporter);
  provider.addSpanProcessor(spanProcessor);
  provider.register();
  providerRegistered = true;

  registerInstrumentations({
    instrumentations: [
      new ExpressInstrumentation({
        requestHook: (span, info) => {
          span.setAttribute("service.name", serviceName);
          if (info.layerType === ExpressLayerType.REQUEST_HANDLER) {
            span.setAttribute("express.base_url", info.request?.baseUrl);
          }
        },
        ignoreLayersType: ["middleware", "request_handler"],  
      }),
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.updateName(`${request.method} ${request.host}${request.path}`);
          span.setAttribute("service.name", serviceName);
        },
      }),
      ...instrumentations
    ],
  });

  return trace.getTracer(serviceName);
};
