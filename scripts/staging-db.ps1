param(
  [Parameter(Position = 0)]
  [ValidateSet("setup", "start", "stop", "health", "recreate")]
  [string]$Action = "health"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$runtimeRoot = Join-Path $repoRoot ".monolith-staging"
$dataDirectory = Join-Path $runtimeRoot "postgres-data"
$logPath = Join-Path $runtimeRoot "postgres.log"
$envPath = Join-Path $repoRoot ".env.staging.local"
$expectedDatabase = "monolith_accounting_staging"
$expectedAdminUser = "monolith_staging_admin"
$expectedAppUser = "monolith_staging"
$expectedPort = 56432

function New-LocalSecret {
  param([int]$Bytes = 36)

  $buffer = New-Object byte[] $Bytes
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($buffer)
  }
  finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($buffer).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Find-PostgresBin {
  if ($env:STAGING_PG_BIN) {
    $candidate = [IO.Path]::GetFullPath($env:STAGING_PG_BIN)
    if (Test-Path -LiteralPath (Join-Path $candidate "initdb.exe")) {
      return $candidate
    }
  }

  $roots = @(
    (Join-Path $env:ProgramFiles "PostgreSQL"),
    (Join-Path ${env:ProgramFiles(x86)} "PostgreSQL")
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  foreach ($root in $roots) {
    $candidate = Get-ChildItem -LiteralPath $root -Directory |
      Sort-Object { [double]($_.Name -replace "[^0-9.]", "") } -Descending |
      ForEach-Object { Join-Path $_.FullName "bin" } |
      Where-Object { Test-Path -LiteralPath (Join-Path $_ "initdb.exe") } |
      Select-Object -First 1
    if ($candidate) {
      return $candidate
    }
  }

  throw "PostgreSQL client/server binaries were not found. Set STAGING_PG_BIN to the PostgreSQL bin directory."
}

function Import-StagingEnvironment {
  if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Missing .env.staging.local. Run 'npm run staging:db:setup' first."
  }

  foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match "^\s*#" -or $line -notmatch "^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
      continue
    }
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
  }

  if (
    $env:MONOLITH_ENV -ne "staging" -or
    $env:STAGING_MARKER -ne "MONOLITH_ACCOUNTING_STAGING_ONLY" -or
    $env:STAGING_DATABASE_HOST -ne "127.0.0.1" -or
    [int]$env:STAGING_DATABASE_PORT -ne $expectedPort -or
    $env:STAGING_DATABASE_NAME -ne $expectedDatabase -or
    $env:STAGING_DATABASE_ADMIN_USER -ne $expectedAdminUser -or
    $env:STAGING_DATABASE_USER -ne $expectedAppUser
  ) {
    throw "Refusing to continue: .env.staging.local does not identify the approved local staging database."
  }
}

function New-StagingEnvironment {
  if (Test-Path -LiteralPath $envPath) {
    return
  }

  $adminPassword = New-LocalSecret
  $appPassword = New-LocalSecret
  $authSecret = New-LocalSecret -Bytes 48
  $testPassword = New-LocalSecret
  $databaseUrl = "postgresql://${expectedAppUser}:${appPassword}@127.0.0.1:${expectedPort}/${expectedDatabase}?schema=public"

  $lines = @(
    "MONOLITH_ENV=staging",
    "STAGING_MARKER=MONOLITH_ACCOUNTING_STAGING_ONLY",
    "STAGING_DATABASE_HOST=127.0.0.1",
    "STAGING_DATABASE_PORT=$expectedPort",
    "STAGING_DATABASE_NAME=$expectedDatabase",
    "STAGING_DATABASE_ADMIN_USER=$expectedAdminUser",
    "STAGING_DATABASE_ADMIN_PASSWORD=$adminPassword",
    "STAGING_DATABASE_USER=$expectedAppUser",
    "STAGING_DATABASE_PASSWORD=$appPassword",
    "DATABASE_URL=$databaseUrl",
    "AUTH_SECRET=$authSecret",
    "STAGING_TEST_PASSWORD=$testPassword",
    "CRON_SECRET=$authSecret",
    "NEXTAUTH_URL=http://localhost:3100",
    "APP_URL=http://localhost:3100",
    "MONOLITH_NEXT_DIST_DIR=.monolith-staging/next",
    "EMAIL_PROVIDER=disabled",
    "EMAIL_FROM=staging@staging.example.com",
    "RESEND_API_KEY=",
    "SMTP_HOST=",
    "SMTP_PORT=587",
    "SMTP_SECURE=false",
    "SMTP_USER=",
    "SMTP_PASS=",
    "ERPNEXT_HOST=",
    "ERPNEXT_PORT=",
    "ERPNEXT_IP=",
    "ERPNEXT_API_KEY=",
    "ERPNEXT_API_SECRET=",
    "ESSL_DB_SERVER=",
    "ESSL_DB_PORT=",
    "ESSL_DB_NAME=",
    "ESSL_DB_USER=",
    "ESSL_DB_PASSWORD=",
    "JUSTDIAL_HEADLESS=true",
    "GEMINI_API_KEY=",
    "RECRUIT_MODULE_ENABLED=false",
    "GOOGLE_CLOUD_PROJECT_ID=",
    "GOOGLE_CLOUD_PROJECT_NUMBER=",
    "GOOGLE_WORKSPACE_DOMAIN=",
    "GOOGLE_CHAT_BOT_NAME=",
    "GOOGLE_CHAT_SA_EMAIL=",
    "GOOGLE_CHAT_SA_PRIVATE_KEY_ID=",
    "GOOGLE_CHAT_SA_PRIVATE_KEY=",
    "GOOGLE_CHAT_WEBHOOK_URL=",
    "GOOGLE_CHAT_LINK_SECRET=",
    "AUTH_GOOGLE_ID=",
    "AUTH_GOOGLE_SECRET="
  )
  [IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))
}

function Add-StagingSafeDefaults {
  $existing = @{}
  foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)=") {
      $existing[$Matches[1]] = $true
    }
  }

  $defaults = [ordered]@{
    "CRON_SECRET" = $env:AUTH_SECRET
    "MONOLITH_NEXT_DIST_DIR" = ".monolith-staging/next"
    "EMAIL_PROVIDER" = "disabled"
    "EMAIL_FROM" = "staging@staging.example.com"
    "RESEND_API_KEY" = ""
    "SMTP_HOST" = ""
    "SMTP_PORT" = "587"
    "SMTP_SECURE" = "false"
    "SMTP_USER" = ""
    "SMTP_PASS" = ""
    "ERPNEXT_HOST" = ""
    "ERPNEXT_PORT" = ""
    "ERPNEXT_IP" = ""
    "ERPNEXT_API_KEY" = ""
    "ERPNEXT_API_SECRET" = ""
    "ESSL_DB_SERVER" = ""
    "ESSL_DB_PORT" = ""
    "ESSL_DB_NAME" = ""
    "ESSL_DB_USER" = ""
    "ESSL_DB_PASSWORD" = ""
    "JUSTDIAL_HEADLESS" = "true"
    "GEMINI_API_KEY" = ""
    "RECRUIT_MODULE_ENABLED" = "false"
    "GOOGLE_CLOUD_PROJECT_ID" = ""
    "GOOGLE_CLOUD_PROJECT_NUMBER" = ""
    "GOOGLE_WORKSPACE_DOMAIN" = ""
    "GOOGLE_CHAT_BOT_NAME" = ""
    "GOOGLE_CHAT_SA_EMAIL" = ""
    "GOOGLE_CHAT_SA_PRIVATE_KEY_ID" = ""
    "GOOGLE_CHAT_SA_PRIVATE_KEY" = ""
    "GOOGLE_CHAT_WEBHOOK_URL" = ""
    "GOOGLE_CHAT_LINK_SECRET" = ""
    "AUTH_GOOGLE_ID" = ""
    "AUTH_GOOGLE_SECRET" = ""
  }
  $additionalLines = @()
  foreach ($entry in $defaults.GetEnumerator()) {
    if (-not $existing.ContainsKey($entry.Key)) {
      $additionalLines += "$($entry.Key)=$($entry.Value)"
    }
  }
  if ($additionalLines.Count -gt 0) {
    $allLines = @((Get-Content -LiteralPath $envPath)) + $additionalLines
    [IO.File]::WriteAllLines($envPath, $allLines, [Text.UTF8Encoding]::new($false))
  }
}

function Assert-SafePaths {
  $resolvedRuntime = [IO.Path]::GetFullPath($runtimeRoot)
  $resolvedData = [IO.Path]::GetFullPath($dataDirectory)
  $expectedRuntime = [IO.Path]::GetFullPath((Join-Path $repoRoot ".monolith-staging"))
  if ($resolvedRuntime -ne $expectedRuntime -or -not $resolvedData.StartsWith($resolvedRuntime + [IO.Path]::DirectorySeparatorChar)) {
    throw "Refusing to operate outside the repository staging runtime directory."
  }
}

function Test-PortAvailable {
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $expectedPort -ErrorAction SilentlyContinue
  return -not $listeners
}

function Start-StagingPostgres {
  param([string]$PgBin)

  $pgCtl = Join-Path $PgBin "pg_ctl.exe"
  & $pgCtl status -D $dataDirectory *> $null
  if ($LASTEXITCODE -eq 0) {
    return
  }
  if (-not (Test-PortAvailable)) {
    throw "Port $expectedPort is already in use; refusing to connect to or start an unidentified service."
  }

  & $pgCtl start -D $dataDirectory -l $logPath -o "-h 127.0.0.1 -p $expectedPort" -w
  if ($LASTEXITCODE -ne 0) {
    throw "The isolated staging PostgreSQL cluster did not start."
  }
}

function Test-StagingHealth {
  param([string]$PgBin)

  $previousPassword = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = $env:STAGING_DATABASE_PASSWORD
    $psql = Join-Path $PgBin "psql.exe"
    $result = & $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAppUser -d $expectedDatabase -tAc "SELECT current_database() || '|' || current_user || '|' || COALESCE(shobj_description(oid, 'pg_database'), '') FROM pg_database WHERE datname = current_database();"
    if ($LASTEXITCODE -ne 0 -or ([string]$result).Trim() -ne "$expectedDatabase|$expectedAppUser|MONOLITH_ACCOUNTING_STAGING_ONLY") {
      throw "Staging health verification failed."
    }
    Write-Output "Healthy: local PostgreSQL staging database marker, name, and application user verified."
  }
  finally {
    $env:PGPASSWORD = $previousPassword
  }
}

function Reset-StagingDatabase {
  param([string]$PgBin)

  # The application-level health check must pass before admin credentials are
  # used for the narrowly scoped destructive operation.
  Test-StagingHealth -PgBin $PgBin

  $previousPassword = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = $env:STAGING_DATABASE_ADMIN_PASSWORD
    $psql = Join-Path $PgBin "psql.exe"
    $identity = [string](& $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres -tAc "SELECT datname || '|' || COALESCE(shobj_description(oid, 'pg_database'), '') FROM pg_database WHERE datname = '$expectedDatabase';")
    if ($LASTEXITCODE -ne 0 -or $identity.Trim() -ne "$expectedDatabase|MONOLITH_ACCOUNTING_STAGING_ONLY") {
      throw "Refusing to recreate: database name or staging marker verification failed."
    }

    & $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$expectedDatabase' AND pid <> pg_backend_pid();" *> $null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to close staging-only database sessions."
    }

    & (Join-Path $PgBin "dropdb.exe") -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser $expectedDatabase
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to drop the verified staging database."
    }

    & (Join-Path $PgBin "createdb.exe") -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser --owner=$expectedAppUser $expectedDatabase
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to recreate the staging database."
    }

    "COMMENT ON DATABASE $expectedDatabase IS 'MONOLITH_ACCOUNTING_STAGING_ONLY';" |
      & $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to restore the staging database marker."
    }
  }
  finally {
    $env:PGPASSWORD = $previousPassword
  }

  Test-StagingHealth -PgBin $PgBin
  Write-Output "The verified isolated staging database was recreated empty."
}

Assert-SafePaths
$pgBin = Find-PostgresBin

switch ($Action) {
  "setup" {
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    New-StagingEnvironment
    Import-StagingEnvironment
    Add-StagingSafeDefaults
    Import-StagingEnvironment

    if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
      if (-not (Test-PortAvailable)) {
        throw "Port $expectedPort is already in use; refusing to initialize against an unidentified service."
      }

      $passwordFile = Join-Path $runtimeRoot "initdb-password.tmp"
      try {
        [IO.File]::WriteAllText($passwordFile, $env:STAGING_DATABASE_ADMIN_PASSWORD, [Text.UTF8Encoding]::new($false))
        & (Join-Path $pgBin "initdb.exe") --pgdata=$dataDirectory --username=$expectedAdminUser --pwfile=$passwordFile --auth-host=scram-sha-256 --auth-local=scram-sha-256 --encoding=UTF8 --no-locale
        if ($LASTEXITCODE -ne 0) {
          throw "PostgreSQL cluster initialization failed."
        }
      }
      finally {
        if (Test-Path -LiteralPath $passwordFile) {
          Remove-Item -LiteralPath $passwordFile -Force
        }
      }
    }

    Start-StagingPostgres -PgBin $pgBin

    $previousPassword = $env:PGPASSWORD
    try {
      $env:PGPASSWORD = $env:STAGING_DATABASE_ADMIN_PASSWORD
      $psql = Join-Path $pgBin "psql.exe"
      $roleExists = [string](& $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$expectedAppUser';")
      if ($roleExists -ne "1") {
        $escapedPassword = $env:STAGING_DATABASE_PASSWORD.Replace("'", "''")
        "CREATE ROLE $expectedAppUser LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '$escapedPassword';" |
          & $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres
        if ($LASTEXITCODE -ne 0) {
          throw "Failed to create the staging application role."
        }
      }

      $databaseExists = [string](& $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$expectedDatabase';")
      if ($databaseExists -ne "1") {
        & (Join-Path $pgBin "createdb.exe") -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser --owner=$expectedAppUser $expectedDatabase
        if ($LASTEXITCODE -ne 0) {
          throw "Failed to create the staging database."
        }
      }

      "COMMENT ON DATABASE $expectedDatabase IS 'MONOLITH_ACCOUNTING_STAGING_ONLY';" |
        & $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $expectedPort -U $expectedAdminUser -d postgres
      if ($LASTEXITCODE -ne 0) {
        throw "Failed to apply the staging database marker."
      }
    }
    finally {
      $env:PGPASSWORD = $previousPassword
    }

    Test-StagingHealth -PgBin $pgBin
    Write-Output "Setup complete. Secrets remain only in the ignored .env.staging.local file."
  }
  "start" {
    Import-StagingEnvironment
    if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
      throw "The staging cluster is not initialized. Run 'npm run staging:db:setup'."
    }
    Start-StagingPostgres -PgBin $pgBin
    Test-StagingHealth -PgBin $pgBin
  }
  "stop" {
    Import-StagingEnvironment
    if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
      throw "The staging cluster is not initialized."
    }
    & (Join-Path $pgBin "pg_ctl.exe") status -D $dataDirectory *> $null
    if ($LASTEXITCODE -eq 0) {
      & (Join-Path $pgBin "pg_ctl.exe") stop -D $dataDirectory -m fast -w
      if ($LASTEXITCODE -ne 0) {
        throw "The staging cluster did not stop cleanly."
      }
    }
    Write-Output "The isolated staging PostgreSQL cluster is stopped."
  }
  "health" {
    Import-StagingEnvironment
    Test-StagingHealth -PgBin $pgBin
  }
  "recreate" {
    Import-StagingEnvironment
    if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
      throw "The isolated staging cluster is not initialized."
    }
    Start-StagingPostgres -PgBin $pgBin
    Reset-StagingDatabase -PgBin $pgBin
  }
}
