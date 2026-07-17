# Workers

Background workers will claim MySQL `queue_jobs` records using short transactions, lock ownership, bounded retries, and idempotent handlers.

No HTTP controller should perform long-running work directly.
