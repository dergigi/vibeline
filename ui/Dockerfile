FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the Next.js application
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=555
ENV VOICE_MEMOS_DIR=/app/VoiceMemos

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./
# Plugin discovery checks these filenames at runtime.
COPY --from=build /app/src/plugins ./src/plugins

EXPOSE 555

# Create a volume for the VoiceMemos directory
VOLUME [ "/app/VoiceMemos" ]

# Start the application
CMD ["npm", "start"]
