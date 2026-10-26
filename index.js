import { context, diag, DiagConsoleLogger, DiagLogLevel, propagation, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from "@opentelemetry/core";
// Instrumentations intructs different libraries to automatically collect telemetry data
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation, ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
// TracerProvider is necessary to register instrumentations and to send manual traces to the exporter
import { BatchSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler, TracerProvider } from "@opentelemetry/sdk-trace";
import { detectResources, resourceFromAttributes } from "@opentelemetry/resources";
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

  const resource = detectResources({ detectors: [ gcpDetector ] })
    .merge(resourceFromAttributes({ "service.name": serviceName }));

  const provider = new TracerProvider({
    resource,
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.01) }),
    spanProcessors: [ new BatchSpanProcessor(exporter) ],
  });

  context.setGlobalContextManager(new AsyncLocalStorageContextManager());
  propagation.setGlobalPropagator(new CompositePropagator({ propagators: [ new W3CTraceContextPropagator(), new W3CBaggagePropagator() ] }));
  trace.setGlobalTracerProvider(provider);
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
