import { config } from "./config/env.js";
import { createApp } from "./app/app.js";

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
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

void startServer();
