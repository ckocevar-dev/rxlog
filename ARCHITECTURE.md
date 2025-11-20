# RxLog — Architecture

```mermaid
flowchart LR
  Client[React Frontend] -->|/api/*| GW[Spring Cloud Gateway]
  GW --> REG[Bookservice (Java)]
  GW --> BAR[Barcode (Go)]
  REG --> PG[(PostgreSQL)]
  BAR --> PG
  MOB --> PG
  ANA --> PG
  AUT <--> R[(Redis)]
  BAR <--> R
```
