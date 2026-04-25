import { config } from "./config/env";
import { createApp } from "./app/app";

const startServer = async (): Promise<void> => {
  const fastify = await createApp();

  try {
    await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });

    fastify.log.info(
      `🚀 Server listening on http://${config.HOST}:${config.PORT}`
    );
    fastify.log.info(`📝 Environment: ${config.NODE_ENV}`);

    // Graceful shutdown — drain in-flight requests before exit.
    // Container orchestrators (k8s, ECS) send SIGTERM first; we close
    // the Fastify instance which: stops accepting new connections,
    // waits for in-flight handlers, then resolves. Idempotent so we
    // can register both SIGTERM and SIGINT.
    let shuttingDown = false;
    const gracefulShutdown = async (signal: string): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;
      fastify.log.info(`${signal} received — draining and shutting down...`);
      try {
        await fastify.close();
        fastify.log.info("Server closed cleanly");
        process.exit(0);
      } catch (err) {
        fastify.log.error({ err }, "Error during graceful shutdown");
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => {
      void gracefulShutdown("SIGTERM");
    });
    process.on("SIGINT", () => {
      void gracefulShutdown("SIGINT");
    });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

void startServer();
