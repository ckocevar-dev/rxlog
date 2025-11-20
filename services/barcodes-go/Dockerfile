# ---------- Build stage ----------
FROM golang:1.23-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -o /out/svc .

# ---------- Runtime stage ----------
FROM gcr.io/distroless/static-debian12
USER 65532:65532
COPY --from=build /out/svc /svc
EXPOSE 8082
ENTRYPOINT ["/svc"]