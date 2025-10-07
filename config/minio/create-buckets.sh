#!/bin/sh

set -eu

if [ -z "${MINIO_ROOT_USER:-}" ] || [ -z "${MINIO_ROOT_PASSWORD:-}" ]; then
    echo "MINIO_ROOT_USER and MINIO_ROOT_PASSWORD must be provided" >&2
    exit 1
fi

: "${MINIO_BUCKET_NAME:=app-bucket}"
: "${MINIO_REGION:=us-east-1}"
: "${MINIO_INTERNAL_ENDPOINT:=http://minio:9000}"
: "${MINIO_ALIAS_RETRY_ATTEMPTS:=10}"
: "${MINIO_ALIAS_RETRY_DELAY:=3}"

if ! command -v mc >/dev/null 2>&1; then
    echo "MinIO client 'mc' executable not found in PATH" >&2
    exit 1
fi

alias_name="local"

attempt=1
alias_configured=false
while [ "${attempt}" -le "${MINIO_ALIAS_RETRY_ATTEMPTS}" ]; do
    if mc alias set "${alias_name}" "${MINIO_INTERNAL_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; then
        alias_configured=true
        break
    fi

    if [ "${attempt}" -lt "${MINIO_ALIAS_RETRY_ATTEMPTS}" ]; then
        echo "MinIO is not ready yet (attempt ${attempt}/${MINIO_ALIAS_RETRY_ATTEMPTS}), retrying in ${MINIO_ALIAS_RETRY_DELAY}s..." >&2
        sleep "${MINIO_ALIAS_RETRY_DELAY}"
    fi

    attempt=$((attempt + 1))
done

if [ "${alias_configured}" != "true" ]; then
    echo "Failed to configure MinIO client after ${MINIO_ALIAS_RETRY_ATTEMPTS} attempts" >&2
    exit 1
fi

echo "MinIO client alias '${alias_name}' configured"

if ! mc ls "${alias_name}/${MINIO_BUCKET_NAME}" >/dev/null 2>&1; then
    mc mb --ignore-existing --region="${MINIO_REGION}" "${alias_name}/${MINIO_BUCKET_NAME}"
    echo "Bucket ${MINIO_BUCKET_NAME} ensured in region ${MINIO_REGION}"
fi

mc anonymous set download "${alias_name}/${MINIO_BUCKET_NAME}" >/dev/null
echo "Anonymous download policy applied to bucket ${MINIO_BUCKET_NAME}"

