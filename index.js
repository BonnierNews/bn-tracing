import { diag, DiagConsoleLogger, DiagLogLevel, trace } from "@opentelemetry/api";
// Instrumentations intructs different libraries to automatically collect telemetry data
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation, ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
// NodeTracerProvider is the default tracer provider for Node.js
// Necessary to register instrumentations
import { NodeTracerProvider, ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";
// Use sdk-trace base to send create manual traces and send them to the exporter
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { TraceExporter } from "@google-cloud/opentelemetry-cloud-trace-exporter";

let providerRegistered = false;
export default ({ serviceName = "default", debug = false, instrumentations = [] }) => {
  if (providerRegistered) {
    return trace.getTracer(serviceName);
  }
  if (debug) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const exporter = new TraceExporter();

  const provider = new NodeTracerProvider({ sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.01) }) });

  // Configure the span processor to send spans to the exporter
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
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
      }),
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.updateName(`${request.method} ${request.host}${request.path}`);
          span.setAttribute("service.name", serviceName);
        },
      }),
      ...instrumentations,
    ],
  });

  return trace.getTracer(serviceName);
};
