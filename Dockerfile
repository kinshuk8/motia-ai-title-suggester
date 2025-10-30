# Stage 1: Builder
# Use a Node.js image with a recent LTS version for building
FROM oven/bun:1.1.18 AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and bun.lockb to leverage Docker cache
# bun.lockb is Bun's lockfile
COPY package.json bun.lock ./

# Install project dependencies using Bun
# 'bun install --frozen-lockfile' is preferred for reproducible builds in CI/CD environments
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the Motia.dev application
# This assumes 'bun run build' compiles TypeScript to a 'dist' directory
RUN bun run build

# Stage 2: Production
# Use a lean Bun runtime image for the final production image
FROM oven/bun:1.1.18 AS production

# Set the working directory
WORKDIR /app

# Copy only the compiled output and production dependencies from the builder stage
# This significantly reduces the final image size
COPY --from=builder /app/dist ./dist
# Bun's node_modules are often not strictly needed if everything is bundled into dist,
# but it's safer to copy if there are runtime dependencies not included in the build output.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/motia.config.json ./motia.config.json
COPY --from=builder /app/types.d.ts ./types.d.ts # Copy types.d.ts if it's needed at runtime for some reason

# Copy environment variables if they are part of the image (though often mounted at runtime)
# If you manage .env files outside Docker, you can remove or comment this line
COPY --from=builder /app/.env ./.env

# Expose the port your Motia.dev application listens on (default is often 3000 or 8080)
# You might need to adjust this based on your motia.config.json or application's port
EXPOSE 3000

# Define the command to run your application
# For Motia.dev, 'motia start' would typically run the compiled application.
# If 'dist/index.js' is the main entry point after 'bun run build', you might use 'bun dist/index.js'
# Assuming 'bun run start' is the way to run the production build based on package.json
CMD ["bun", "run", "start"]
# If you don't have a 'start' script, use: CMD ["motia", "start"] if motia CLI is available globally in the Bun image.
# Otherwise, determine the direct executable path, e.g., ["bun", "dist/index.js"]
