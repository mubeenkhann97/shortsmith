# Observability

Shortsmith reports errors and product analytics to **PostHog** and ships logs to
**Axiom**. Both are optional: with no tokens configured nothing is sent, which
is the default for self-hosted installs.

| Surface | PostHog | Logs |
|---------|---------|------|
| Backend API, ARQ worker | exceptions (`posthog` Python SDK) | JSON on stdout → Vector → Axiom |
| Web (Next.js) | analytics, session replay, exceptions | container stdout → Vector → Axiom |

Point the tokens at your own PostHog project (for example `<your-posthog-project>` on the EU
cloud) and your own Axiom dataset `<your-dataset>` (org `<your-axiom-org>`).

## Following an error from PostHog to the logs

Every API request carries a trace id. Clients send `x-trace-id`; the backend
generates one otherwise, echoes it in the response header and in error bodies,
and stamps it on every log line. Worker jobs use `task-<task_id>` and
`social-<post_id>`.

Exceptions in PostHog carry the same `trace_id` property and, when a user was
authenticated, the Better Auth user id as the distinct id. To see what the
backend did around an error, query Axiom with the trace id:

```kusto
['<your-dataset>']
| where trace_id == "task-6f1c..."
| sort by _time asc
```

All logs for one user: `| where user_id == "<user id>"`. Errors only:
`| where level == "ERROR"`. Each line has a `service` field (`backend`,
`worker`, `frontend`, `mcp`, `nginx`, ...).

## Backend and worker

`src/observability.py` configures logging. Every record logged with a
traceback (`logger.exception(...)` or `exc_info=True`) is also sent to PostHog
error tracking, as are uncaught exceptions. Records without a traceback only
go to the logs.

| Variable | Purpose |
|----------|---------|
| `POSTHOG_PROJECT_TOKEN` | Project token (`phc_...`). Empty disables PostHog. |
| `POSTHOG_HOST` | Ingest host, default `https://eu.i.posthog.com`. |
| `SUPOCLIP_SERVICE` | `backend` or `worker`; set by docker-compose. |

## Shipping logs to Axiom

The `vector` service in `docker-compose.yml` (config in
`observability/vector.yaml`) reads the logs of every `shortsmith-*` container
through the Docker socket, parses the backend's JSON lines into fields, drops
health-check noise and sends everything to Axiom. It only starts with the
`axiom` profile:

```bash
# in the production .env
COMPOSE_PROFILES=axiom
AXIOM_TOKEN=xaat-...        # ingest-only token for the dataset
AXIOM_DATASET=<your-dataset>

docker compose up -d vector
```

### nginx

On the production host nginx runs outside Docker and serves several sites into
one shared `access.log`. The Shortsmith vhosts (`www` and `api`, port 443) also
write their own files, which Vector picks up. They show what the backend never
sees: 413s for oversized uploads, 502s while a container restarts, 504s on slow
uploads, and frontend page/asset requests. Upload body size and the
response-header timeout for `/api/upload` and `POST /upload` are also set in
that host config; the values that keep a multi-gigabyte upload from ending in
504 are in `docs/media-storage.md`.

`/etc/nginx/conf.d/shortsmith-log.conf`:

```nginx
# $uri, not $request_uri: query strings can carry tokens.
log_format shortsmith_json escape=json
  '{"time":"$time_iso8601","host":"$host","method":"$request_method","path":"$uri",'
  '"status":$status,"bytes":$body_bytes_sent,"request_length":$request_length,'
  '"request_time":$request_time,"upstream_status":"$upstream_status",'
  '"upstream_time":"$upstream_response_time","remote_addr":"$remote_addr",'
  '"referer":"$http_referer","user_agent":"$http_user_agent",'
  '"trace_id":"$upstream_http_x_trace_id"}';
```

In the site and API 443 server blocks (for example `example.com` and `api.example.com`) of
`sites-available/shortsmith` (the shared logs are listed again because a
server-level `access_log` replaces the inherited one):

```nginx
access_log /var/log/nginx/access.log;
access_log /var/log/nginx/shortsmith.access.log shortsmith_json;
error_log /var/log/nginx/error.log;
error_log /var/log/nginx/shortsmith.error.log warn;
```

Apply with `sudo nginx -t && sudo systemctl reload nginx`. The existing
logrotate rule for `/var/log/nginx/*.log` covers the new files.
