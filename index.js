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
import { detectResources } from "@opentelemetry/resources";
import { gcpDetector } from "@opentelemetry/resource-detector-gcp";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });

let providerRegistered = false;
export default ({ serviceName = "default", debug = false, instrumentations = [] }) => {
  if (providerRegistered) {
    return trace.getTracer(serviceName);
  }
  if (debug) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const exporter = new OTLPTraceExporter({
    url: "https://telemetry.googleapis.com/v1/traces",
    async headers() {
      const authClient = await auth.getClient();
      return authClient.getRequestHeaders();
    },
  });

  const resource = detectResources({ detectors: [ gcpDetector ] });

  const provider = new NodeTracerProvider({
    resource,
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.01) }),
    spanProcessors: [ new BatchSpanProcessor(exporter) ],
  });

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
